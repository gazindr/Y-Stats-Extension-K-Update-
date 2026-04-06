import {
    API,
    DATA_ATTRIBUTES,
    DEFAULT_CHART_METRIC,
    DEFAULT_COLLECTION_OPTIONS,
    DEFAULT_GROUPING,
    GROUPING,
    METRIC_DEFINITIONS,
    PERIODS,
    TIMINGS,
} from './config/constants.js'
import { ApiService } from './services/api.service.js'
import { DomService } from './services/dom.service.js'
import { Logger } from './services/logger.service.js'
import { VersionService } from './services/version.service.js'
import {
    buildDailyMetricPoints,
    createBucketOptions,
    findBucketByStart,
    findEarliestTimestamp,
    findLatestTimestamp,
    getChartMetricOptions,
    getCollectedMetricKeys,
    getSelectedGameIndexes,
    groupMetricPoints,
    isApplicationsPage,
    prepareGamesTableData,
    sortGamesTableData,
    summarizePoints,
} from './utils/helpers.js'
import { formatDate, formatDateRange } from './utils/formatters.js'
import { normalizeRequestDelay } from './utils/validators.js'
import { StatsView } from './views/stats-view.js'

const DAY_MS = 24 * 60 * 60 * 1000

export class App {
    constructor() {
        this.view = new StatsView()
        this.domService = new DomService(this.view)
        this.rawData = null
        this.gamesInfo = []
        this.accounts = []
        this.collectedGameIds = new Set()
        this.selectedGameIds = new Set()
        this.selectedAccountIds = new Set()
        this.selectedPeriod = PERIODS.MONTH_CURRENT
        this.selectedGrouping = DEFAULT_GROUPING
        this.selectedChartMetric = DEFAULT_CHART_METRIC
        this.selectedBucket = null
        this.customRange = { start: '', end: '' }
        this.collectionOptions = { ...DEFAULT_COLLECTION_OPTIONS }
        this.loadedCollectionOptions = { ...DEFAULT_COLLECTION_OPTIONS }
        this.isCollectionPanelCollapsed = false
        this.csrfToken = null
        this.isLoading = false
        this.isGamesLoading = false
        this.loadingProgress = null
        this.settings = {
            enabled: true,
            requestDelay: API.REQUEST_DELAY,
            selectedPeriod: PERIODS.MONTH_CURRENT,
        }
        this.activeTab = 'overview'
        this.sortBy = 'totalRevenue'
        this.sortOrder = 'desc'
        this.versionChecked = false
        this._bootstrapPromise = null
    }

    async init() {
        await this.loadSettings()

        if (!this.settings.enabled) {
            Logger.info('Extension is disabled')
            return
        }

        this.domService.setInsertCallback(() => this.onBlockInserted())
        this.domService.startUrlMonitoring((newUrl) => this.handleUrlChange(newUrl))
        this.domService.tryInsert()

        this.bootstrapMetadata().catch((error) => {
            Logger.error('Metadata bootstrap failed:', error)
        })
    }

    async bootstrapMetadata(force = false) {
        if (this._bootstrapPromise && !force) {
            return this._bootstrapPromise
        }

        this.isGamesLoading = true
        this.renderCurrentState()

        this._bootstrapPromise = (async () => {
            try {
                const [token, gamesInfo] = await Promise.all([
                    this.ensureCsrfToken(),
                    ApiService.fetchGamesList(),
                ])

                if (token) {
                    this.csrfToken = token
                }

                this.setGamesInfo(gamesInfo)
            } finally {
                this.isGamesLoading = false
                this.renderCurrentState()
            }
        })()

        try {
            await this._bootstrapPromise
        } finally {
            this._bootstrapPromise = null
        }
    }

    async loadSettings() {
        const defaultSettings = {
            enabled: true,
            requestDelay: API.REQUEST_DELAY,
            selectedPeriod: PERIODS.MONTH_CURRENT,
        }

        try {
            const storedSettings = await this.getStoredSettings(defaultSettings)
            const { enabled, requestDelay, selectedPeriod } = {
                ...defaultSettings,
                ...storedSettings,
            }

            this.settings = {
                enabled: Boolean(enabled),
                requestDelay: normalizeRequestDelay(requestDelay),
                selectedPeriod: this.normalizePeriod(selectedPeriod),
            }

            this.selectedPeriod = this.settings.selectedPeriod
        } catch (error) {
            Logger.error('Settings load failed:', error)
            this.settings = defaultSettings
            this.selectedPeriod = this.normalizePeriod(defaultSettings.selectedPeriod)
        }
    }

    getStoredSettings(defaultSettings) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            return Promise.resolve(defaultSettings)
        }

        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(defaultSettings, (items) => {
                    if (chrome.runtime && chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError)
                        return
                    }

                    resolve(items)
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    async ensureCsrfToken(force = false) {
        if (this.csrfToken && !force) {
            return this.csrfToken
        }

        const token = await ApiService.fetchAndParseCsrfToken()
        if (token) {
            this.csrfToken = token
            Logger.info('CSRF token received')
        } else {
            Logger.warn('Failed to get CSRF token')
        }

        return this.csrfToken
    }

    setGamesInfo(gamesInfo = []) {
        this.gamesInfo = Array.isArray(gamesInfo) ? gamesInfo : []

        const accountMap = new Map()
        this.gamesInfo.forEach((game) => {
            accountMap.set(String(game.accountId), {
                id: String(game.accountId),
                name: game.accountName,
            })
        })

        this.accounts = Array.from(accountMap.values())

        const allGameIds = new Set(this.gamesInfo.map((game) => String(game.id)))
        const allAccountIds = new Set(this.accounts.map((account) => String(account.id)))

        if (this.selectedGameIds.size === 0) {
            this.selectedGameIds = allGameIds
        } else {
            this.selectedGameIds = new Set(
                [...this.selectedGameIds].filter((gameId) => allGameIds.has(String(gameId))),
            )

            if (this.selectedGameIds.size === 0) {
                this.selectedGameIds = allGameIds
            }
        }

        if (this.selectedAccountIds.size === 0) {
            this.selectedAccountIds = allAccountIds
        } else {
            this.selectedAccountIds = new Set(
                [...this.selectedAccountIds].filter((accountId) =>
                    allAccountIds.has(String(accountId)),
                ),
            )

            if (this.selectedAccountIds.size === 0) {
                this.selectedAccountIds = allAccountIds
            }
        }
    }

    handleUrlChange(newUrl) {
        if (isApplicationsPage(newUrl)) {
            if (!this.view.isInDOM()) {
                this.domService.tryInsert()
            } else {
                this.renderCurrentState()
            }
        } else {
            this.domService.removeBlock()
        }
    }

    onBlockInserted() {
        if (!this.versionChecked) {
            this.versionChecked = true
            this.renderVersionInfo()
        }

        this.renderCurrentState()

        setTimeout(() => {
            this.domService.startObserver()
            this.domService.startPeriodicCheck()
        }, TIMINGS.OBSERVER_START_DELAY)
    }

    getCollectionState() {
        return {
            gamesInfo: this.gamesInfo,
            accounts: this.accounts,
            selectedGameIds: this.selectedGameIds,
            selectedAccountIds: this.selectedAccountIds,
            collectionOptions: this.collectionOptions,
            isGamesLoading: this.isGamesLoading,
            isLoading: this.isLoading,
            hasRawData: Boolean(this.rawData),
            loadedGameIds: this.collectedGameIds,
            isCollapsed: this.isCollectionPanelCollapsed,
        }
    }

    buildRenderContext() {
        const selectedIndexes = getSelectedGameIndexes(
            this.gamesInfo,
            this.selectedGameIds,
            this.selectedAccountIds,
        )

        const collectedIndexes = selectedIndexes.filter((index) =>
            this.collectedGameIds.has(String(this.gamesInfo[index]?.id)),
        )

        const displayOptions = this.loadedCollectionOptions
        const metricKeys = getCollectedMetricKeys(displayOptions)
        const range = this.getPeriodRange(collectedIndexes, metricKeys)
        const dailyPoints = buildDailyMetricPoints(this.rawData, range, collectedIndexes, metricKeys)
        const groupedPoints = groupMetricPoints(dailyPoints, this.selectedGrouping, range)
        const bucketOptions = createBucketOptions(groupedPoints)

        if (
            this.selectedBucket &&
            !bucketOptions.some((option) => String(option.value) === String(this.selectedBucket))
        ) {
            this.selectedBucket = null
        }

        const activeBucket = findBucketByStart(groupedPoints, this.selectedBucket)
        const effectiveGamesCount = collectedIndexes.length
        const summary = activeBucket
            ? {
                  ...activeBucket,
                  amount: activeBucket.totalRevenue,
                  gamesCount: effectiveGamesCount,
              }
            : summarizePoints(dailyPoints, effectiveGamesCount)

        const tableRange = activeBucket
            ? {
                  start: activeBucket.rangeStart ?? activeBucket.bucketStart,
                  end: activeBucket.rangeEnd ?? activeBucket.bucketEnd,
              }
            : range

        const tableData = sortGamesTableData(
            prepareGamesTableData(
                this.rawData,
                this.gamesInfo,
                tableRange.start,
                tableRange.end,
                collectedIndexes,
                displayOptions,
            ),
            this.sortBy,
            this.sortOrder,
        )

        const chartMetricOptions = getChartMetricOptions(displayOptions)
        if (!chartMetricOptions.some((option) => option.key === this.selectedChartMetric)) {
            this.selectedChartMetric = chartMetricOptions[0]?.key || DEFAULT_CHART_METRIC
        }

        return {
            summary,
            tableData,
            chartData: { points: groupedPoints },
            displayOptions,
            controls: {
                selectedPeriod: this.selectedPeriod,
                selectedGrouping: this.selectedGrouping,
                bucketOptions,
                selectedBucket: this.selectedBucket,
                customRange: this.customRange,
                chartMetricOptions,
                selectedChartMetric: this.selectedChartMetric,
            },
            dateLabel: activeBucket
                ? activeBucket.fullLabel
                : this.formatRangeLabel(range),
        }
    }

    renderCurrentState() {
        if (!this.view.isInDOM()) {
            return
        }

        if (this.isLoading && this.loadingProgress) {
            this.view.showLoadingProgress(
                this.loadingProgress.current,
                this.loadingProgress.total,
                this.loadingProgress,
            )
            return
        }

        const collectionState = this.getCollectionState()

        if (!this.rawData) {
            this.view.showSetup({ collectionState })
            this.attachEventHandlers()
            return
        }

        const renderContext = this.buildRenderContext()

        if (this.activeTab === 'games-table') {
            this.view.showGamesTable({
                gamesData: renderContext.tableData,
                controls: renderContext.controls,
                collectionState,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder,
                displayOptions: renderContext.displayOptions,
            })
        } else if (this.activeTab === 'chart') {
            this.view.showChart({
                chartData: renderContext.chartData,
                controls: renderContext.controls,
                collectionState,
                displayOptions: renderContext.displayOptions,
            })
        } else {
            this.view.showOverview({
                summary: renderContext.summary,
                controls: renderContext.controls,
                collectionState,
                displayOptions: renderContext.displayOptions,
            })
        }

        this.updateDateDisplay(renderContext.dateLabel)
        this.attachEventHandlers()
    }

    attachEventHandlers() {
        this.setupLoadButton()
        this.setupTabSwitcher()
        this.setupPeriodButtons()
        this.setupGroupingButtons()
        this.setupBucketSelector()
        this.setupCustomRangeButton()
        this.setupChartMetricSelector()
        this.setupCollectionOptions()
        this.setupCollectionPanelToggle()
        this.setupFilterButtons()
        this.setupFilterCheckboxes()
        this.setupTableSorting()
    }

    setupLoadButton() {
        const button = document.querySelector(`[data-stats="${DATA_ATTRIBUTES.LOAD_BUTTON}"]`)
        if (!button) return

        button.onclick = () => this.loadData()
    }

    setupTabSwitcher() {
        document.querySelectorAll('[data-tab]').forEach((tab) => {
            tab.onclick = () => {
                this.activeTab = tab.dataset.tab
                this.renderCurrentState()
            }
        })
    }

    setupPeriodButtons() {
        document.querySelectorAll('[data-period]').forEach((button) => {
            button.onclick = () => {
                this.selectedPeriod = this.normalizePeriod(button.dataset.period)
                this.selectedBucket = null
                this.renderCurrentState()
            }
        })
    }

    setupGroupingButtons() {
        document.querySelectorAll('[data-grouping]').forEach((button) => {
            button.onclick = () => {
                this.selectedGrouping = button.dataset.grouping || GROUPING.DAY
                this.selectedBucket = null
                this.renderCurrentState()
            }
        })
    }

    setupBucketSelector() {
        const selector = document.querySelector('[data-bucket-selector]')
        if (!selector) return

        selector.onchange = (event) => {
            this.selectedBucket = event.target.value || null
            this.renderCurrentState()
        }
    }

    setupCustomRangeButton() {
        const applyButton = document.querySelector('[data-apply-custom-range]')
        if (!applyButton) return

        applyButton.onclick = () => {
            const start = document.querySelector('[data-custom-range-start]')?.value || ''
            const end = document.querySelector('[data-custom-range-end]')?.value || ''

            if (!start || !end) {
                alert('Укажите обе даты для своего диапазона')
                return
            }

            if (start > end) {
                alert('Дата начала не может быть позже даты окончания')
                return
            }

            this.customRange = { start, end }
            this.selectedBucket = null
            this.renderCurrentState()
        }
    }

    setupChartMetricSelector() {
        const selector = document.querySelector('[data-chart-metric-selector]')
        if (!selector) return

        selector.onchange = (event) => {
            this.selectedChartMetric = event.target.value || DEFAULT_CHART_METRIC
            this.renderCurrentState()
        }
    }

    setupCollectionOptions() {
        document.querySelectorAll('[data-collection-option]').forEach((checkbox) => {
            checkbox.onchange = () => {
                const key = checkbox.dataset.collectionOption
                if (!key || key === 'revenue') return

                this.collectionOptions = {
                    ...this.collectionOptions,
                    [key]: checkbox.checked,
                }

                this.renderCurrentState()
            }
        })
    }

    setupCollectionPanelToggle() {
        const toggle = document.querySelector('[data-panel-toggle]')
        if (!toggle) return

        const handleToggle = () => {
            this.isCollectionPanelCollapsed = !this.isCollectionPanelCollapsed
            this.renderCurrentState()
        }

        toggle.onclick = handleToggle
        toggle.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleToggle()
            }
        }
    }

    setupFilterButtons() {
        document.querySelectorAll('[data-select-all]').forEach((button) => {
            button.onclick = () => this.toggleAllForType(button.dataset.selectAll, true)
        })

        document.querySelectorAll('[data-clear-all]').forEach((button) => {
            button.onclick = () => this.toggleAllForType(button.dataset.clearAll, false)
        })
    }

    toggleAllForType(type, checked) {
        if (type === 'game') {
            this.selectedGameIds = checked
                ? new Set(this.gamesInfo.map((game) => String(game.id)))
                : new Set()
        }

        if (type === 'account') {
            this.selectedAccountIds = checked
                ? new Set(this.accounts.map((account) => String(account.id)))
                : new Set()
        }

        this.selectedBucket = null
        this.renderCurrentState()
    }

    setupFilterCheckboxes() {
        document.querySelectorAll('[data-game-filter]').forEach((checkbox) => {
            checkbox.onchange = () => {
                const gameId = String(checkbox.dataset.gameFilter || '')
                if (!gameId) return

                if (checkbox.checked) {
                    this.selectedGameIds.add(gameId)
                } else {
                    this.selectedGameIds.delete(gameId)
                }

                this.selectedBucket = null
                this.renderCurrentState()
            }
        })

        document.querySelectorAll('[data-account-filter]').forEach((checkbox) => {
            checkbox.onchange = () => {
                const accountId = String(checkbox.dataset.accountFilter || '')
                if (!accountId) return

                if (checkbox.checked) {
                    this.selectedAccountIds.add(accountId)
                } else {
                    this.selectedAccountIds.delete(accountId)
                }

                this.selectedBucket = null
                this.renderCurrentState()
            }
        })
    }

    setupTableSorting() {
        document.querySelectorAll('.stats-table th.sortable').forEach((header) => {
            header.onclick = () => {
                const sortBy = header.dataset.sort

                if (this.sortBy === sortBy) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
                } else {
                    this.sortBy = sortBy
                    this.sortOrder = 'desc'
                }

                this.renderCurrentState()
            }
        })
    }

    async renderVersionInfo() {
        try {
            const info = await VersionService.checkVersion()
            this.view.showVersionInfo(info)
        } catch (error) {
            Logger.warn('Version info render skipped:', error.message)
        }
    }

    async loadData() {
        if (this.isLoading) {
            Logger.info('Loading is already in progress')
            return
        }

        if (this.gamesInfo.length === 0) {
            await this.bootstrapMetadata(true)
        }

        const selectedIndexes = getSelectedGameIndexes(
            this.gamesInfo,
            this.selectedGameIds,
            this.selectedAccountIds,
        )

        if (selectedIndexes.length === 0) {
            alert('Выберите хотя бы одну игру или аккаунт для сбора статистики')
            return
        }

        const token = await this.ensureCsrfToken(true)
        if (!token) {
            alert('Не удалось получить токен авторизации. Попробуйте обновить страницу.')
            return
        }

        this.isLoading = true
        this.loadingProgress = {
            current: 0,
            total: selectedIndexes.length,
            gameName: '',
            metricLabel: '',
        }
        this.renderCurrentState()

        try {
            const metricKeys = getCollectedMetricKeys(this.collectionOptions)
            const metricData = Object.fromEntries(
                Object.keys(METRIC_DEFINITIONS).map((key) => [key, new Array(this.gamesInfo.length).fill(null)]),
            )

            this.collectedGameIds = new Set()

            for (let i = 0; i < selectedIndexes.length; i++) {
                const gameIndex = selectedIndexes[i]
                const game = this.gamesInfo[gameIndex]
                const gameId = String(game.id)
                this.collectedGameIds.add(gameId)

                Logger.info(`Start collecting metrics for game ${gameId} (${game.name})`)

                this.loadingProgress = {
                    current: i + 1,
                    total: selectedIndexes.length,
                    gameName: game.name,
                    metricLabel: `${metricKeys.length} метрик`,
                }
                this.renderCurrentState()

                await Promise.all(
                    metricKeys.map(async (metricKey) => {
                        const definition = METRIC_DEFINITIONS[metricKey]
                        const requestKey = `${definition.endpoint || 'chartkit'}:${definition.slug}`
                        game.__metricRequestCache = game.__metricRequestCache || new Map()

                        try {
                            Logger.info(
                                `Fetching ${metricKey} for game ${gameId} (${game.name}), endpoint ${definition.endpoint || 'chartkit'}, slug ${definition.slug}`,
                            )
                            if (!game.__metricRequestCache.has(requestKey)) {
                                game.__metricRequestCache.set(
                                    requestKey,
                                    this.fetchMetricEntry(token, gameId, definition),
                                )
                            }

                            metricData[metricKey][gameIndex] =
                                await game.__metricRequestCache.get(requestKey)
                            Logger.info(`Fetched ${metricKey} for game ${gameId}`)
                        } catch (error) {
                            Logger.error(`Failed ${metricKey} for game ${gameId}:`, error)
                            metricData[metricKey][gameIndex] = null
                        }
                    }),
                )

                delete game.__metricRequestCache

                if (i < selectedIndexes.length - 1) {
                    await this.delay(this.settings.requestDelay)
                }
            }

            this.rawData = {
                metricData,
            }
            this.loadedCollectionOptions = { ...this.collectionOptions }

            metricKeys.forEach((metricKey) => {
                const hasAnyData = metricData[metricKey]?.some((entry) => Boolean(entry))
                if (!hasAnyData) {
                    Logger.warn(
                        `Metric ${metricKey} returned no data for selected games. Check slug ${METRIC_DEFINITIONS[metricKey]?.slug}.`,
                    )
                }
            })

            this.selectedBucket = null
            this.activeTab = 'overview'
            this.renderCurrentState()
        } catch (error) {
            Logger.error('Data load failed:', error)
            alert('Не удалось собрать статистику. Подробности смотрите в консоли браузера.')
        } finally {
            this.isLoading = false
            this.loadingProgress = null
            this.renderCurrentState()
        }
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async fetchMetricEntry(token, gameId, definition) {
        if (definition?.endpoint === 'promo') {
            return ApiService.fetchPromoData(token, gameId, definition.slug)
        }

        return ApiService.fetchChartkitData(token, gameId, definition.slug)
    }

    updateDateDisplay(label) {
        const dateElement = this.view.element?.querySelector(`[data-stats="${DATA_ATTRIBUTES.DATE}"]`)
        if (dateElement) {
            dateElement.textContent = label || ''
        }
    }

    formatRangeLabel(range) {
        const start = new Date(range.start)
        const end = new Date(range.end)

        if (start.toDateString() === end.toDateString()) {
            return formatDate(start)
        }

        return formatDateRange(start, end)
    }

    getPeriodRange(selectedIndexes, metricKeys) {
        const lastTimestamp =
            findLatestTimestamp(this.rawData?.metricData, metricKeys, selectedIndexes) || Date.now()
        const endDate = new Date(lastTimestamp)

        if (this.selectedPeriod === PERIODS.ALL_TIME) {
            const start =
                findEarliestTimestamp(this.rawData?.metricData, metricKeys, selectedIndexes) ||
                lastTimestamp
            return { start, end: lastTimestamp }
        }

        if (this.selectedPeriod === PERIODS.CUSTOM) {
            const start = this.parseDateStart(this.customRange.start)
            const end = this.parseDateEnd(this.customRange.end)

            if (start && end) {
                return { start, end }
            }
        }

        if (this.selectedPeriod === PERIODS.MONTH_CURRENT) {
            const start = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1)
            const end = Math.min(
                Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0, 23, 59, 59, 999),
                lastTimestamp,
            )
            return { start, end }
        }

        if (this.selectedPeriod === PERIODS.MONTH_PREV) {
            const start = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 1, 1)
            const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 0, 23, 59, 59, 999)
            return { start, end }
        }

        if (this.selectedPeriod === PERIODS.DAY) {
            const start = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
            return { start, end: lastTimestamp }
        }

        const days =
            this.selectedPeriod === PERIODS.WEEK
                ? 7
                : this.selectedPeriod === PERIODS.MONTH
                  ? 30
                  : 30

        return {
            start: lastTimestamp - (days - 1) * DAY_MS,
            end: lastTimestamp,
        }
    }

    parseDateStart(value) {
        if (!value) return null
        const [year, month, day] = value.split('-').map(Number)
        if (!year || !month || !day) return null
        return Date.UTC(year, month - 1, day, 0, 0, 0, 0)
    }

    parseDateEnd(value) {
        if (!value) return null
        const [year, month, day] = value.split('-').map(Number)
        if (!year || !month || !day) return null
        return Date.UTC(year, month - 1, day, 23, 59, 59, 999)
    }

    normalizePeriod(period) {
        const allowed = new Set(Object.values(PERIODS))
        return allowed.has(period) ? period : PERIODS.MONTH_CURRENT
    }

    destroy() {
        this.domService.stopObserver()
        this.domService.stopPeriodicCheck()
        this.domService.stopUrlMonitoring()
    }
}
