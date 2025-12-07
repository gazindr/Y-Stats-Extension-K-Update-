import { formatMoney } from '../utils/formatters.js'
import { SELECTORS, DATA_ATTRIBUTES } from '../config/constants.js'

export class StatsView {
    constructor() {
        this.element = null
    }

    create() {
        const block = document.createElement('div')
        block.className = 'yandex-stats-block'
        block.id = SELECTORS.STATS_BLOCK_ID
        block.setAttribute('data-extension-block', 'true')

        const container = this._createInitialStructure()
        block.appendChild(container)

        this.element = block
        return block
    }

    showInitialLoading() {
        if (!this.element) return

        const content = this.element.querySelector('[data-stats="content"]')
        if (content) {
            content.textContent = ''

            const loadingDiv = document.createElement('div')
            loadingDiv.className = 'stats-loading'

            const spinner = document.createElement('div')
            spinner.className = 'stats-spinner'

            const loadingText = document.createElement('div')
            loadingText.className = 'stats-loading-text'
            loadingText.textContent = 'Загружаем данные...'

            loadingDiv.appendChild(spinner)
            loadingDiv.appendChild(loadingText)
            content.appendChild(loadingDiv)
        }
    }

    showLoadingProgress(current, total) {
        if (!this.element) return

        const content = this.element.querySelector('[data-stats="content"]')
        if (content) {
            const percent = Math.round((current / total) * 100)

            content.textContent = ''

            const loadingDiv = document.createElement('div')
            loadingDiv.className = 'stats-loading'

            const loadingText = document.createElement('div')
            loadingText.className = 'stats-loading-text'
            loadingText.textContent = 'Загружаем данные...'

            const loadingCounter = document.createElement('div')
            loadingCounter.className = 'stats-loading-counter'
            loadingCounter.textContent = `${current} из ${total} игр`

            const progressBar = document.createElement('div')
            progressBar.className = 'stats-progress-bar'

            const progressFill = document.createElement('div')
            progressFill.className = 'stats-progress-fill'
            progressFill.style.width = `${percent}%`

            const loadingPercent = document.createElement('div')
            loadingPercent.className = 'stats-loading-percent'
            loadingPercent.textContent = `${percent}%`

            progressBar.appendChild(progressFill)
            loadingDiv.appendChild(loadingText)
            loadingDiv.appendChild(loadingCounter)
            loadingDiv.appendChild(progressBar)
            loadingDiv.appendChild(loadingPercent)

            content.appendChild(loadingDiv)
        }
    }

    showResults(data, selectedPeriod = 'day', availableDates = [], selectedDate = null) {
        if (!this.element) return

        const dateElement = this.element.querySelector('[data-stats="date"]')
        if (dateElement) {
            dateElement.style.display = ''
        }

        const content = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.CONTENT}"]`)
        if (content) {
            content.textContent = ''

            const tabSwitcher = this._createTabSwitcher('overview')
            content.appendChild(tabSwitcher)

            const selectorsWrapper = document.createElement('div')
            selectorsWrapper.className = 'stats-selectors-wrapper'

            if (availableDates.length > 0) {
                const dateSelector = this._createDateSelector(availableDates, selectedDate)
                selectorsWrapper.appendChild(dateSelector)
            }

            const periodSelector = this._createPeriodSelector(selectedPeriod)
            selectorsWrapper.appendChild(periodSelector)

            content.appendChild(selectorsWrapper)

            const totalRow = this._createStatsRow('stats-row--total', [
                { label: 'Общий заработок', value: formatMoney(data.amount), size: 'large' },
            ])
            content.appendChild(totalRow)

            const sourcesRow = this._createStatsRow('stats-row--sources', [
                { label: 'РСЯ', value: formatMoney(data.yandexAds || 0), size: 'medium' },
                {
                    label: 'Внешние сети',
                    value: formatMoney(data.externalAds || 0),
                    size: 'medium',
                },
                { label: 'In-app', value: formatMoney(data.inApp || 0), size: 'medium' },
            ])
            content.appendChild(sourcesRow)

            const footerRow = this._createStatsRow('stats-row--footer', [
                {
                    label: 'Количество игр',
                    value: `${data.gamesCount} игр`,
                    size: 'small',
                    additionalClass: 'stats-item--games',
                },
            ])
            content.appendChild(footerRow)
        }
    }

    isInDOM() {
        return this.element && document.body.contains(this.element)
    }

    showButton() {
        if (!this.element) return

        const content = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.CONTENT}"]`)
        if (content) {
            content.textContent = ''

            const center = document.createElement('div')
            center.className = 'stats-center'

            const button = document.createElement('button')
            button.className = 'stats-load-button'
            button.setAttribute('data-stats', DATA_ATTRIBUTES.LOAD_BUTTON)
            button.textContent = 'Загрузить статистику'

            center.appendChild(button)
            content.appendChild(center)
        }
    }

    _createInitialStructure() {
        const container = document.createElement('div')
        container.className = 'stats-container'

        const header = document.createElement('div')
        header.className = 'stats-header'

        const title = document.createElement('h2')
        title.textContent = 'Y-Stats-Extension — Статистика заработка'

        const dateSpan = document.createElement('span')
        dateSpan.className = 'stats-date'
        dateSpan.setAttribute('data-stats', DATA_ATTRIBUTES.DATE)
        dateSpan.style.display = 'none'

        header.appendChild(title)
        header.appendChild(dateSpan)

        const content = document.createElement('div')
        content.className = 'stats-content'
        content.setAttribute('data-stats', DATA_ATTRIBUTES.CONTENT)

        const version = document.createElement('div')
        version.className = 'stats-version'
        version.setAttribute('data-stats', DATA_ATTRIBUTES.VERSION)
        version.style.display = 'none'

        const center = document.createElement('div')
        center.className = 'stats-center'

        const button = document.createElement('button')
        button.className = 'stats-load-button'
        button.setAttribute('data-stats', DATA_ATTRIBUTES.LOAD_BUTTON)
        button.textContent = 'Загрузить статистику'

        center.appendChild(button)
        content.appendChild(center)

        container.appendChild(header)
        container.appendChild(version)
        container.appendChild(content)

        return container
    }

    _createPeriodSelector(selectedPeriod) {
        const selector = document.createElement('div')
        selector.className = 'stats-period-selector'

        const periods = [
            { key: 'week', label: '7 дней' },
            { key: 'month', label: '30 дней' },
            { key: 'month_current', label: 'Этот месяц' },
            { key: 'month_prev', label: 'Прошлый месяц' },
            { key: 'all-time', label: 'Все время' },
        ]

        periods.forEach((period) => {
            const button = document.createElement('button')
            button.className = 'stats-period-btn'
            if (selectedPeriod === period.key) {
                button.classList.add('active')
            }
            button.setAttribute('data-period', period.key)
            button.textContent = period.label

            selector.appendChild(button)
        })

        return selector
    }

    _createDateSelector(availableDates, selectedTimestamp = null) {
        const select = document.createElement('select')
        select.className = 'stats-date-select'
        select.setAttribute('data-date-selector', 'true')

        const defaultOption = document.createElement('option')
        defaultOption.value = ''
        defaultOption.textContent = 'Выбрать конкретный день'
        defaultOption.disabled = true
        defaultOption.hidden = false
        defaultOption.selected = selectedTimestamp === null
        select.appendChild(defaultOption)

        availableDates.forEach((dateInfo) => {
            const option = document.createElement('option')
            option.value = dateInfo.timestamp
            option.textContent = dateInfo.label
            option.selected = selectedTimestamp === dateInfo.timestamp
            select.appendChild(option)
        })

        select.value = selectedTimestamp !== null ? selectedTimestamp : ''

        return select
    }

    _createStatsRow(rowClass, items) {
        const row = document.createElement('div')
        row.className = `stats-row ${rowClass}`

        items.forEach((item) => {
            const statsItem = document.createElement('div')
            statsItem.className = 'stats-item'
            if (item.additionalClass) {
                statsItem.classList.add(item.additionalClass)
            }

            const label = document.createElement('span')
            label.className = 'stats-label'
            label.textContent = item.label

            const value = document.createElement('span')
            value.className = `stats-value stats-value--${item.size}`
            value.textContent = item.value

            statsItem.appendChild(label)
            statsItem.appendChild(value)
            row.appendChild(statsItem)
        })

        return row
    }

    _createTabSwitcher(activeTab = 'overview') {
        const tabSwitcher = document.createElement('div')
        tabSwitcher.className = 'stats-tab-switcher'

        const tabs = [
            { key: 'overview', label: 'Общая статистика' },
            { key: 'games-table', label: 'Таблица игр' },
        ]

        tabs.forEach((tab) => {
            const tabButton = document.createElement('button')
            tabButton.className = 'stats-tab-btn'
            if (activeTab === tab.key) {
                tabButton.classList.add('active')
            }
            tabButton.setAttribute('data-tab', tab.key)
            tabButton.textContent = tab.label

            tabSwitcher.appendChild(tabButton)
        })

        return tabSwitcher
    }

    showGamesTable(
        gamesData,
        selectedPeriod = 'day',
        activeTab = 'games-table',
        availableDates = [],
        selectedDate = null,
    ) {
        if (!this.element) return

        const dateElement = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.DATE}"]`)
        if (dateElement) {
            dateElement.style.display = ''
        }

        const content = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.CONTENT}"]`)
        if (content) {
            content.textContent = ''

            const tabSwitcher = this._createTabSwitcher(activeTab)
            content.appendChild(tabSwitcher)

            const selectorsWrapper = document.createElement('div')
            selectorsWrapper.className = 'stats-selectors-wrapper'

            if (availableDates.length > 0) {
                const dateSelector = this._createDateSelector(availableDates, selectedDate)
                selectorsWrapper.appendChild(dateSelector)
            }

            const periodSelector = this._createPeriodSelector(selectedPeriod)
            selectorsWrapper.appendChild(periodSelector)

            content.appendChild(selectorsWrapper)

            const table = this._createGamesTable(gamesData)
            content.appendChild(table)
        }
    }

    _createGamesTable(gamesData) {
        const tableWrapper = document.createElement('div')
        tableWrapper.className = 'stats-table-wrapper'

        const table = document.createElement('table')
        table.className = 'stats-table'

        const thead = this._createTableHeader()
        const tbody = document.createElement('tbody')

        gamesData.forEach((game) => {
            const row = document.createElement('tr')

            const nameCell = document.createElement('td')
            nameCell.className = 'game-name'
            nameCell.setAttribute('data-label', 'Название')
            nameCell.textContent = game.name || 'Неизвестная игра'
            row.appendChild(nameCell)

            const idCell = document.createElement('td')
            idCell.className = 'game-id'
            idCell.setAttribute('data-label', 'ID игры')
            idCell.textContent = game.id || '-'
            row.appendChild(idCell)

            const totalRevenueCell = document.createElement('td')
            totalRevenueCell.className = 'revenue-cell'
            totalRevenueCell.setAttribute('data-label', 'Общий доход')
            totalRevenueCell.textContent = formatMoney(game.totalRevenue)
            row.appendChild(totalRevenueCell)

            const yandexAdsCell = document.createElement('td')
            yandexAdsCell.className = 'revenue-cell'
            yandexAdsCell.setAttribute('data-label', 'РСЯ')
            yandexAdsCell.textContent = formatMoney(game.yandexAds)
            row.appendChild(yandexAdsCell)

            const externalAdsCell = document.createElement('td')
            externalAdsCell.className = 'revenue-cell'
            externalAdsCell.setAttribute('data-label', 'Внешние сети')
            externalAdsCell.textContent = formatMoney(game.externalAds)
            row.appendChild(externalAdsCell)

            const inAppCell = document.createElement('td')
            inAppCell.className = 'revenue-cell'
            inAppCell.setAttribute('data-label', 'In-app')
            inAppCell.textContent = formatMoney(game.inApp)
            row.appendChild(inAppCell)

            tbody.appendChild(row)
        })

        table.appendChild(thead)
        table.appendChild(tbody)
        tableWrapper.appendChild(table)

        return tableWrapper
    }

    _createTableHeader() {
        const thead = document.createElement('thead')
        const tr = document.createElement('tr')

        const headers = [
            { sort: 'name', label: 'Название игры' },
            { sort: 'id', label: 'ID игры' },
            { sort: 'totalRevenue', label: 'Общий доход' },
            { sort: 'yandexAds', label: 'РСЯ' },
            { sort: 'externalAds', label: 'Внешние сети' },
            { sort: 'inApp', label: 'In-app' },
        ]

        headers.forEach((header) => {
            const th = document.createElement('th')
            th.className = 'sortable'
            th.setAttribute('data-sort', header.sort)
            th.textContent = header.label + ' '

            const arrow = document.createElement('span')
            arrow.className = 'sort-arrow'
            arrow.textContent = '↕'
            th.appendChild(arrow)

            tr.appendChild(th)
        })

        thead.appendChild(tr)
        return thead
    }

    showVersionInfo(info) {
        if (!this.element) return

        const versionBlock = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.VERSION}"]`)
        if (!versionBlock) return

        versionBlock.textContent = ''
        versionBlock.style.display = 'none'
        versionBlock.className = 'stats-version'

        const status = info?.status
        if (status !== 'update-available') {
            return
        }

        const current = info?.currentVersion || 'unknown'
        const remote = info?.remoteVersion || 'unknown'
        const url = info?.url || '#'

        const text = document.createElement('span')
        text.className = 'stats-version__text'
        text.textContent = `Доступна новая версия ${remote}. Вы используете ${current}`

        versionBlock.appendChild(text)

        const link = document.createElement('a')
        link.className = 'stats-version__link'
        link.href = url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = 'Open on GitHub'

        versionBlock.appendChild(link)
        versionBlock.classList.add('stats-version--update')
        versionBlock.style.display = ''
    }
}
