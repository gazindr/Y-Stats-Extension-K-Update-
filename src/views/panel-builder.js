import {
    DATA_ATTRIBUTES,
    GROUPING,
    PERIODS,
} from '../config/constants.js'

export function createDiv(className, textContent = '') {
    const div = document.createElement('div')
    div.className = className
    if (textContent) {
        div.textContent = textContent
    }
    return div
}

export function createInitialStructure() {
    const container = document.createElement('div')
    container.className = 'stats-container'

    const header = document.createElement('div')
    header.className = 'stats-header'

    const title = document.createElement('h2')
    title.textContent = 'Y-Stats-Extension'

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

    container.appendChild(header)
    container.appendChild(version)
    container.appendChild(content)

    return container
}

function createMetricToggleCard({ key, label, description, checked, disabled = false }) {
    const labelElement = document.createElement('label')
    labelElement.className = `stats-option-card${disabled ? ' stats-option-card--disabled' : ''}`

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = checked
    input.disabled = disabled
    input.setAttribute('data-collection-option', key)

    const textWrap = document.createElement('div')
    textWrap.className = 'stats-option-card__text'

    const title = document.createElement('div')
    title.className = 'stats-option-card__title'
    title.textContent = label

    const subtitle = document.createElement('div')
    subtitle.className = 'stats-option-card__subtitle'
    subtitle.textContent = description

    textWrap.appendChild(title)
    textWrap.appendChild(subtitle)
    labelElement.appendChild(input)
    labelElement.appendChild(textWrap)

    return labelElement
}

function createCheckboxSection({ title, items = [], emptyText = '', actions = null }) {
    const section = document.createElement('div')
    section.className = 'stats-filter-section'

    const header = document.createElement('div')
    header.className = 'stats-filter-section__header'

    const titleElement = document.createElement('div')
    titleElement.className = 'stats-filter-section__title'
    titleElement.textContent = title
    header.appendChild(titleElement)

    if (actions) {
        const actionsWrap = document.createElement('div')
        actionsWrap.className = 'stats-filter-section__actions'

        const selectAll = document.createElement('button')
        selectAll.type = 'button'
        selectAll.className = 'stats-text-button'
        selectAll.textContent = 'Все'
        selectAll.setAttribute('data-select-all', actions)

        const clearAll = document.createElement('button')
        clearAll.type = 'button'
        clearAll.className = 'stats-text-button'
        clearAll.textContent = 'Снять'
        clearAll.setAttribute('data-clear-all', actions)

        actionsWrap.appendChild(selectAll)
        actionsWrap.appendChild(clearAll)
        header.appendChild(actionsWrap)
    }

    section.appendChild(header)

    const body = document.createElement('div')
    body.className = 'stats-filter-list'

    if (items.length === 0) {
        body.appendChild(createDiv('stats-filter-list__empty', emptyText))
    } else {
        items.forEach((item) => {
            const label = document.createElement('label')
            label.className = 'stats-filter-item'

            const input = document.createElement('input')
            input.type = 'checkbox'
            input.checked = item.checked
            input.setAttribute(`data-${item.dataName}`, item.key)

            const textWrap = document.createElement('div')
            textWrap.className = 'stats-filter-item__text'

            const name = document.createElement('span')
            name.className = 'stats-filter-item__name'
            name.textContent = item.label
            textWrap.appendChild(name)

            if (item.meta) {
                const meta = document.createElement('span')
                meta.className = 'stats-filter-item__meta'
                meta.textContent = item.meta
                textWrap.appendChild(meta)
            }

            label.appendChild(input)
            label.appendChild(textWrap)
            body.appendChild(label)
        })
    }

    section.appendChild(body)
    return section
}

export function createCollectionPanel(collectionState = {}) {
    const {
        gamesInfo = [],
        accounts = [],
        selectedGameIds = new Set(),
        selectedAccountIds = new Set(),
        collectionOptions = {},
        isGamesLoading = false,
        isLoading = false,
        hasRawData = false,
        loadedGameIds = new Set(),
        isCollapsed = false,
    } = collectionState

    const panel = document.createElement('div')
    panel.className = `stats-panel${isCollapsed ? ' stats-panel--collapsed' : ''}`

    const header = document.createElement('div')
    header.className = 'stats-panel__header'
    header.setAttribute('data-panel-toggle', 'true')
    header.setAttribute('role', 'button')
    header.setAttribute('tabindex', '0')

    const titleWrap = document.createElement('div')
    titleWrap.className = 'stats-panel__title-wrap'

    const title = document.createElement('div')
    title.className = 'stats-panel__title'
    title.textContent = 'Параметры сбора'

    const subtitle = document.createElement('div')
    subtitle.className = 'stats-panel__subtitle'
    subtitle.textContent = hasRawData
        ? 'Фильтры сразу применяются к уже загруженным данным'
        : 'Выберите метрики и набор игр перед сбором'

    titleWrap.appendChild(title)
    titleWrap.appendChild(subtitle)

    const toggleIcon = document.createElement('div')
    toggleIcon.className = 'stats-panel__toggle'
    toggleIcon.textContent = isCollapsed ? '▾' : '▴'

    header.appendChild(titleWrap)
    header.appendChild(toggleIcon)
    panel.appendChild(header)

    const contentWrap = document.createElement('div')
    contentWrap.className = 'stats-panel__body'

    const metricsGrid = document.createElement('div')
    metricsGrid.className = 'stats-metrics-grid'

    metricsGrid.appendChild(
        createMetricToggleCard({
            key: 'revenue',
            label: 'Доход',
            description: 'Собирается всегда',
            checked: true,
            disabled: true,
        }),
    )

    metricsGrid.appendChild(
        createMetricToggleCard({
            key: 'includePlayers',
            label: 'Игроки',
            description: 'Основная метрика аудитории',
            checked: Boolean(collectionOptions.includePlayers),
        }),
    )

    metricsGrid.appendChild(
        createMetricToggleCard({
            key: 'includePlaytime',
            label: 'Плейтайм',
            description: 'Минуты по играм',
            checked: Boolean(collectionOptions.includePlaytime),
        }),
    )

    metricsGrid.appendChild(
        createMetricToggleCard({
            key: 'includePromotion',
            label: 'Продвижение',
            description: 'Траты, игроки и минуты из Direct',
            checked: Boolean(collectionOptions.includePromotion),
        }),
    )

    contentWrap.appendChild(metricsGrid)

    const filtersGrid = document.createElement('div')
    filtersGrid.className = 'stats-filters-grid'

    filtersGrid.appendChild(
        createCheckboxSection({
            title: 'Аккаунты',
            emptyText: 'Доступен один контекст аккаунта',
            items: accounts.map((account) => ({
                key: String(account.id),
                label: account.name,
                checked: selectedAccountIds.has(String(account.id)),
                dataName: 'account-filter',
            })),
            actions: accounts.length > 1 ? 'account' : null,
        }),
    )

    filtersGrid.appendChild(
        createCheckboxSection({
            title: 'Игры',
            emptyText: isGamesLoading ? 'Загружаем список игр...' : 'Список игр пока не получен',
            items: gamesInfo.map((game) => ({
                key: String(game.id),
                label: game.name,
                meta: game.accountName,
                checked: selectedGameIds.has(String(game.id)),
                dataName: 'game-filter',
            })),
            actions: gamesInfo.length > 0 ? 'game' : null,
        }),
    )

    contentWrap.appendChild(filtersGrid)

    const footer = document.createElement('div')
    footer.className = 'stats-panel__footer'

    const selectedGamesCount = gamesInfo.filter((game) => selectedGameIds.has(String(game.id))).length
    const summaryText = document.createElement('div')
    summaryText.className = 'stats-panel__summary'
    summaryText.textContent = hasRawData
        ? `Выбрано игр: ${selectedGamesCount} из ${gamesInfo.length}. Загружено: ${loadedGameIds.size}`
        : gamesInfo.length > 0
          ? `Выбрано игр: ${selectedGamesCount} из ${gamesInfo.length}`
          : 'Выберите, что собирать, затем запустите загрузку'

    const loadButton = document.createElement('button')
    loadButton.className = 'stats-load-button'
    loadButton.setAttribute('data-stats', DATA_ATTRIBUTES.LOAD_BUTTON)
    loadButton.disabled =
        isLoading || isGamesLoading || gamesInfo.length === 0 || selectedGamesCount === 0
    loadButton.textContent = hasRawData ? 'Пересобрать статистику' : 'Загрузить статистику'

    footer.appendChild(summaryText)
    footer.appendChild(loadButton)
    contentWrap.appendChild(footer)
    panel.appendChild(contentWrap)

    return panel
}

function createBucketSelector(bucketOptions, selectedBucket, grouping) {
    const select = document.createElement('select')
    select.className = 'stats-date-select'
    select.setAttribute('data-bucket-selector', 'true')

    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent =
        grouping === GROUPING.WEEK
            ? 'Выбрать конкретную неделю'
            : grouping === GROUPING.MONTH
              ? 'Выбрать конкретный месяц'
              : 'Выбрать конкретный день'
    defaultOption.selected = !selectedBucket
    select.appendChild(defaultOption)

    bucketOptions.forEach(({ value, label }) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = label
        option.selected = String(selectedBucket) === String(value)
        select.appendChild(option)
    })

    return select
}

function createGroupingSelector(selectedGrouping) {
    const wrapper = document.createElement('div')
    wrapper.className = 'stats-grouping-selector'

    const options = [
        { key: GROUPING.DAY, label: 'По дням' },
        { key: GROUPING.WEEK, label: 'По неделям' },
        { key: GROUPING.MONTH, label: 'По месяцам' },
    ]

    options.forEach(({ key, label }) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'stats-grouping-btn'
        button.setAttribute('data-grouping', key)
        button.textContent = label

        if (selectedGrouping === key) {
            button.classList.add('active')
        }

        wrapper.appendChild(button)
    })

    return wrapper
}

function createCustomRangeControls(customRange) {
    const wrapper = document.createElement('div')
    wrapper.className = 'stats-custom-range'

    const startInput = document.createElement('input')
    startInput.type = 'date'
    startInput.className = 'stats-custom-range__input'
    startInput.value = customRange?.start || ''
    startInput.setAttribute('data-custom-range-start', 'true')

    const endInput = document.createElement('input')
    endInput.type = 'date'
    endInput.className = 'stats-custom-range__input'
    endInput.value = customRange?.end || ''
    endInput.setAttribute('data-custom-range-end', 'true')

    const applyButton = document.createElement('button')
    applyButton.type = 'button'
    applyButton.className = 'stats-period-btn'
    applyButton.setAttribute('data-apply-custom-range', 'true')
    applyButton.textContent = 'Применить диапазон'

    wrapper.appendChild(startInput)
    wrapper.appendChild(endInput)
    wrapper.appendChild(applyButton)

    return wrapper
}

function createChartMetricSelector(options, selectedChartMetric) {
    const wrapper = document.createElement('div')
    wrapper.className = 'stats-chart-metric-selector'

    const label = document.createElement('span')
    label.className = 'stats-chart-metric-selector__label'
    label.textContent = 'График'
    wrapper.appendChild(label)

    const select = document.createElement('select')
    select.className = 'stats-date-select'
    select.setAttribute('data-chart-metric-selector', 'true')

    options.forEach((option) => {
        const item = document.createElement('option')
        item.value = option.key
        item.textContent = option.label
        item.selected = option.key === selectedChartMetric
        select.appendChild(item)
    })

    wrapper.appendChild(select)
    return wrapper
}

function createPeriodSelector(selectedPeriod) {
    const selector = document.createElement('div')
    selector.className = 'stats-period-selector'

    const periods = [
        { key: PERIODS.DAY, label: 'День' },
        { key: PERIODS.WEEK, label: '7 дней' },
        { key: PERIODS.MONTH, label: '30 дней' },
        { key: PERIODS.MONTH_CURRENT, label: 'Этот месяц' },
        { key: PERIODS.MONTH_PREV, label: 'Прошлый месяц' },
        { key: PERIODS.CUSTOM, label: 'Свой диапазон' },
        { key: PERIODS.ALL_TIME, label: 'Все время' },
    ]

    periods.forEach(({ key, label }) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'stats-period-btn'
        button.setAttribute('data-period', key)
        button.textContent = label

        if (selectedPeriod === key) {
            button.classList.add('active')
        }

        selector.appendChild(button)
    })

    return selector
}

export function createDashboardControls(controls = {}, options = {}) {
    const {
        selectedPeriod = PERIODS.MONTH_CURRENT,
        selectedGrouping = GROUPING.DAY,
        bucketOptions = [],
        selectedBucket = null,
        customRange = { start: '', end: '' },
        chartMetricOptions = [],
        selectedChartMetric = 'revenue',
    } = controls

    const wrapper = document.createElement('div')
    wrapper.className = 'stats-dashboard-controls'

    const topRow = document.createElement('div')
    topRow.className = 'stats-selectors-wrapper'

    if (bucketOptions.length > 0) {
        topRow.appendChild(createBucketSelector(bucketOptions, selectedBucket, selectedGrouping))
    }

    topRow.appendChild(createGroupingSelector(selectedGrouping))
    wrapper.appendChild(topRow)

    wrapper.appendChild(createPeriodSelector(selectedPeriod))

    if (selectedPeriod === PERIODS.CUSTOM) {
        wrapper.appendChild(createCustomRangeControls(customRange))
    }

    if (options.includeChartMetric) {
        wrapper.appendChild(
            createChartMetricSelector(chartMetricOptions, selectedChartMetric),
        )
    }

    return wrapper
}

export function createTabSwitcher(activeTab = 'overview') {
    const tabSwitcher = document.createElement('div')
    tabSwitcher.className = 'stats-tab-switcher'

    const tabs = [
        { key: 'overview', label: 'Общая статистика' },
        { key: 'chart', label: 'График' },
        { key: 'games-table', label: 'Таблица игр' },
    ]

    tabs.forEach(({ key, label }) => {
        const tabButton = document.createElement('button')
        tabButton.className = 'stats-tab-btn'
        if (activeTab === key) {
            tabButton.classList.add('active')
        }
        tabButton.setAttribute('data-tab', key)
        tabButton.textContent = label
        tabSwitcher.appendChild(tabButton)
    })

    return tabSwitcher
}
