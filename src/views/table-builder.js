import { formatMetricValue, formatMoney } from '../utils/formatters.js'

function createStatsRow(rowClass, items) {
    const row = document.createElement('div')
    row.className = `stats-row ${rowClass}`

    items.forEach(({ label, value, size, additionalClass }) => {
        const statsItem = document.createElement('div')
        statsItem.className = 'stats-item'

        if (additionalClass) {
            statsItem.classList.add(additionalClass)
        }

        const labelEl = document.createElement('span')
        labelEl.className = 'stats-label'
        labelEl.textContent = label

        const valueEl = document.createElement('span')
        valueEl.className = `stats-value stats-value--${size}`
        valueEl.textContent = value

        statsItem.appendChild(labelEl)
        statsItem.appendChild(valueEl)
        row.appendChild(statsItem)
    })

    return row
}

export function createSummaryRows(summary, collectionOptions = {}) {
    const wrapper = document.createElement('div')
    wrapper.className = 'stats-summary'

    wrapper.appendChild(
        createStatsRow('stats-row--total', [
            {
                label: 'Общий доход',
                value: formatMoney(summary.totalRevenue),
                size: 'large',
            },
        ]),
    )

    wrapper.appendChild(
        createStatsRow('stats-row--sources', [
            { label: 'РСЯ', value: formatMoney(summary.yandexAds || 0), size: 'medium' },
            {
                label: 'Внешние сети',
                value: formatMoney(summary.externalAds || 0),
                size: 'medium',
            },
            { label: 'In-app', value: formatMoney(summary.inApp || 0), size: 'medium' },
        ]),
    )

    const mainMetrics = []
    if (collectionOptions.includePlayers) {
        mainMetrics.push({
            label: 'Игроки',
            value: formatMetricValue(summary.players || 0, 'number'),
            size: 'medium',
        })
    }

    if (collectionOptions.includePlaytime) {
        mainMetrics.push({
            label: 'Плейтайм',
            value: formatMetricValue(summary.playtimeMinutes || 0, 'minutes'),
            size: 'medium',
        })
        mainMetrics.push({
            label: 'Плейтайм на игрока',
            value: formatMetricValue(summary.playtimePerPlayer || 0, 'minutes'),
            size: 'medium',
        })
    }

    if (mainMetrics.length > 0) {
        wrapper.appendChild(createStatsRow('stats-row--players', mainMetrics))
    }

    if (collectionOptions.includePromotion) {
        wrapper.appendChild(
            createStatsRow('stats-row--sources', [
                {
                    label: 'Промо: траты',
                    value: formatMetricValue(summary.directSpend || 0, 'currency'),
                    size: 'medium',
                },
                {
                    label: 'Промо: игроки',
                    value: formatMetricValue(summary.directPlayers || 0, 'number'),
                    size: 'medium',
                },
                {
                    label: 'Органика: игроки',
                    value: formatMetricValue(summary.directOrganicPlayers || 0, 'number'),
                    size: 'medium',
                },
                {
                    label: 'Промо: минуты',
                    value: formatMetricValue(summary.directMinutes || 0, 'minutes'),
                    size: 'medium',
                },
                {
                    label: 'Органика: минуты',
                    value: formatMetricValue(summary.directOrganicMinutes || 0, 'minutes'),
                    size: 'medium',
                },
            ]),
        )
    }

    wrapper.appendChild(
        createStatsRow('stats-row--footer', [
            {
                label: 'Количество игр',
                value: `${summary.gamesCount || 0} игр`,
                size: 'small',
                additionalClass: 'stats-item--games',
            },
        ]),
    )

    return wrapper
}

function createTableHeader(headers, sortBy, sortOrder) {
    const thead = document.createElement('thead')
    const tr = document.createElement('tr')

    headers.forEach(({ sort, label }) => {
        const th = document.createElement('th')
        th.className = 'sortable'
        th.setAttribute('data-sort', sort)
        th.textContent = label + ' '

        if (sortBy === sort) {
            th.classList.add('sorted')
        }

        const arrow = document.createElement('span')
        arrow.className = 'sort-arrow'
        arrow.textContent = sortBy === sort ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'
        th.appendChild(arrow)
        tr.appendChild(th)
    })

    thead.appendChild(tr)
    return thead
}

function createTableRow(game, headers) {
    const row = document.createElement('tr')

    headers.forEach(({ sort, label, formatter }) => {
        const cell = document.createElement('td')
        cell.setAttribute('data-label', label)

        if (sort === 'name') {
            cell.className = 'game-name'
        } else if (sort === 'id') {
            cell.className = 'game-id'
        } else {
            cell.className = 'revenue-cell'
        }

        const value = game?.[sort]
        if (formatter) {
            cell.textContent = formatMetricValue(value || 0, formatter)
        } else {
            cell.textContent = value || '-'
        }

        row.appendChild(cell)
    })

    return row
}

export function createGamesTable(gamesData, collectionOptions = {}, sortBy, sortOrder) {
    const tableWrapper = document.createElement('div')
    tableWrapper.className = 'stats-table-wrapper'

    const table = document.createElement('table')
    table.className = 'stats-table'

    const headers = [
        { sort: 'name', label: 'Игра' },
        { sort: 'accountName', label: 'Аккаунт' },
        { sort: 'id', label: 'ID' },
        { sort: 'totalRevenue', label: 'Общий доход', formatter: 'currency' },
        { sort: 'yandexAds', label: 'РСЯ', formatter: 'currency' },
        { sort: 'externalAds', label: 'Внешние сети', formatter: 'currency' },
        { sort: 'inApp', label: 'In-app', formatter: 'currency' },
    ]

    if (collectionOptions.includePlayers) {
        headers.push({ sort: 'players', label: 'Игроки', formatter: 'number' })
        headers.push({
            sort: 'revenuePerPlayer',
            label: '₽/игрок',
            formatter: 'currency',
        })
    }

    if (collectionOptions.includePlaytime) {
        headers.push({
            sort: 'playtimeMinutes',
            label: 'Плейтайм',
            formatter: 'minutes',
        })
        headers.push({
            sort: 'playtimePerPlayer',
            label: 'Плейтайм/игрок',
            formatter: 'minutes',
        })
    }

    if (collectionOptions.includePromotion) {
        headers.push({ sort: 'directSpend', label: 'Промо: траты', formatter: 'currency' })
        headers.push({ sort: 'directPlayers', label: 'Промо: игроки', formatter: 'number' })
        headers.push({
            sort: 'directOrganicPlayers',
            label: 'Органика: игроки',
            formatter: 'number',
        })
        headers.push({ sort: 'directMinutes', label: 'Промо: минуты', formatter: 'minutes' })
        headers.push({
            sort: 'directOrganicMinutes',
            label: 'Органика: минуты',
            formatter: 'minutes',
        })
    }

    table.appendChild(createTableHeader(headers, sortBy, sortOrder))

    const tbody = document.createElement('tbody')
    gamesData.forEach((game) => {
        tbody.appendChild(createTableRow(game, headers))
    })
    table.appendChild(tbody)

    tableWrapper.appendChild(table)
    return tableWrapper
}
