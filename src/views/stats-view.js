import { CHART_COLORS, DATA_ATTRIBUTES, SELECTORS } from '../config/constants.js'
import { formatAxisValue, formatMetricValue, hexToRgba } from '../utils/formatters.js'
import {
    createCollectionPanel,
    createDashboardControls,
    createDiv,
    createInitialStructure,
    createTabSwitcher,
} from './panel-builder.js'
import { createGamesTable, createSummaryRows } from './table-builder.js'

export class StatsView {
    constructor() {
        this.element = null
        this._chartInstance = null
    }

    create() {
        const block = document.createElement('div')
        block.className = 'yandex-stats-block'
        block.id = SELECTORS.STATS_BLOCK_ID
        block.setAttribute('data-extension-block', 'true')

        const container = createInitialStructure()
        block.appendChild(container)

        this.element = block
        return block
    }

    isInDOM() {
        return this.element && document.body.contains(this.element)
    }

    destroy() {
        if (this._chartInstance) {
            this._chartInstance.destroy()
            this._chartInstance = null
        }
    }

    showSetup({ collectionState }) {
        const content = this._getContentAndClear()
        if (!content) return

        this._hideDateElement()
        content.appendChild(createCollectionPanel(collectionState))
    }

    showLoadingProgress(current, total, details = {}) {
        const content = this._getContentAndClear()
        if (!content) return

        this._hideDateElement()

        const percent = total > 0 ? Math.round((current / total) * 100) : 0
        const loadingDiv = document.createElement('div')
        loadingDiv.className = 'stats-loading'

        const spinner = document.createElement('div')
        spinner.className = 'stats-spinner'
        loadingDiv.appendChild(spinner)

        loadingDiv.appendChild(createDiv('stats-loading-text', 'Собираем статистику...'))
        loadingDiv.appendChild(createDiv('stats-loading-counter', `${current} из ${total} игр`))

        if (details.gameName) {
            loadingDiv.appendChild(createDiv('stats-loading-details', `Игра: ${details.gameName}`))
        }

        if (details.metricLabel) {
            loadingDiv.appendChild(
                createDiv('stats-loading-details', `Метрика: ${details.metricLabel}`),
            )
        }

        const progressBar = document.createElement('div')
        progressBar.className = 'stats-progress-bar'

        const progressFill = document.createElement('div')
        progressFill.className = 'stats-progress-fill'
        progressFill.style.width = `${percent}%`

        progressBar.appendChild(progressFill)
        loadingDiv.appendChild(progressBar)
        loadingDiv.appendChild(createDiv('stats-loading-percent', `${percent}%`))

        content.appendChild(loadingDiv)
    }

    showOverview({ summary, controls, collectionState, displayOptions }) {
        const content = this._getContentAndClear()
        if (!content) return

        this._showDateElement()
        content.appendChild(createCollectionPanel(collectionState))
        content.appendChild(createTabSwitcher('overview'))
        content.appendChild(createDashboardControls(controls))
        content.appendChild(createSummaryRows(summary, displayOptions))
    }

    showGamesTable({ gamesData, controls, collectionState, sortBy, sortOrder, displayOptions }) {
        const content = this._getContentAndClear()
        if (!content) return

        this._showDateElement()
        content.appendChild(createCollectionPanel(collectionState))
        content.appendChild(createTabSwitcher('games-table'))
        content.appendChild(createDashboardControls(controls))
        content.appendChild(createGamesTable(gamesData, displayOptions, sortBy, sortOrder))
    }

    showChart({ chartData, controls, collectionState }) {
        const content = this._getContentAndClear()
        if (!content) return

        this._showDateElement()
        content.appendChild(createCollectionPanel(collectionState))
        content.appendChild(createTabSwitcher('chart'))
        content.appendChild(createDashboardControls(controls, { includeChartMetric: true }))
        content.appendChild(this._createChart(chartData, controls.selectedChartMetric))
    }

    showVersionInfo(info) {
        if (!this.element) return

        const versionBlock = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.VERSION}"]`)
        if (!versionBlock) return

        versionBlock.textContent = ''
        versionBlock.style.display = 'none'
        versionBlock.className = 'stats-version'

        if (info?.status !== 'update-available') return

        const current = info?.currentVersion || 'unknown'
        const remote = info?.remoteVersion || 'unknown'
        const url = info?.url || '#'

        const text = document.createElement('span')
        text.className = 'stats-version__text'
        text.textContent = `Доступна новая версия ${remote}. У вас ${current}`
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

    _getContentAndClear() {
        if (!this.element) return null

        const content = this.element.querySelector(`[data-stats="${DATA_ATTRIBUTES.CONTENT}"]`)
        if (content) {
            content.textContent = ''
        }

        if (this._chartInstance) {
            this._chartInstance.destroy()
            this._chartInstance = null
        }

        return content
    }

    _showDateElement() {
        const dateElement = this.element?.querySelector(`[data-stats="${DATA_ATTRIBUTES.DATE}"]`)
        if (dateElement) {
            dateElement.style.display = ''
        }
    }

    _hideDateElement() {
        const dateElement = this.element?.querySelector(`[data-stats="${DATA_ATTRIBUTES.DATE}"]`)
        if (dateElement) {
            dateElement.style.display = 'none'
        }
    }

    _createChart(chartData = {}, selectedChartMetric = 'revenue') {
        const container = document.createElement('div')
        container.className = 'stats-chart-container'

        if (!chartData?.points?.length) {
            const noData = document.createElement('div')
            noData.className = 'stats-chart-no-data'
            noData.textContent = 'Нет данных для отображения'
            container.appendChild(noData)
            return container
        }

        const chartWrapper = document.createElement('div')
        chartWrapper.className = 'stats-chart-wrapper'

        const canvas = document.createElement('canvas')
        canvas.id = 'stats-chart-canvas'
        chartWrapper.appendChild(canvas)
        container.appendChild(chartWrapper)

        const labels = chartData.points.map((point) => point.dateLabel)
        const config = this._getChartSeriesConfig(chartData.points, selectedChartMetric)

        requestAnimationFrame(() => {
            if (!document.body.contains(canvas)) return

            const ctx = canvas.getContext('2d')
            const gradients = this._createChartGradients(ctx)

            this._chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: config.datasets.map((dataset) =>
                        this._createDatasetConfig(dataset, gradients),
                    ),
                },
                options: this._getChartOptions(config.formatter),
            })
        })

        return container
    }

    _getChartSeriesConfig(points, selectedChartMetric) {
        const map = {
            players: {
                formatter: 'number',
                datasets: [
                    {
                        label: 'Игроки',
                        data: points.map((p) => p.players),
                        color: CHART_COLORS.players,
                        gradient: 'players',
                    },
                ],
            },
            playtime: {
                formatter: 'minutes',
                datasets: [
                    {
                        label: 'Плейтайм',
                        data: points.map((p) => p.playtimeMinutes),
                        color: CHART_COLORS.playtime,
                        gradient: 'playtime',
                    },
                ],
            },
            playtimePerPlayer: {
                formatter: 'minutes',
                datasets: [
                    {
                        label: 'Плейтайм на игрока',
                        data: points.map((p) => p.playtimePerPlayer),
                        color: CHART_COLORS.playtime,
                        gradient: 'playtime',
                    },
                ],
            },
            directSpend: {
                formatter: 'currency',
                datasets: [
                    {
                        label: 'Промо: траты',
                        data: points.map((p) => p.directSpend),
                        color: CHART_COLORS.directSpend,
                        gradient: 'directSpend',
                    },
                ],
            },
            directPlayers: {
                formatter: 'number',
                datasets: [
                    {
                        label: 'Промо',
                        data: points.map((p) => p.directPlayers),
                        color: CHART_COLORS.directPlayers,
                        gradient: 'directPlayers',
                    },
                    {
                        label: 'Органика',
                        data: points.map((p) => p.directOrganicPlayers),
                        color: CHART_COLORS.directOrganicPlayers,
                        gradient: 'directOrganicPlayers',
                    },
                ],
            },
            directMinutes: {
                formatter: 'minutes',
                datasets: [
                    {
                        label: 'Промо',
                        data: points.map((p) => p.directMinutes),
                        color: CHART_COLORS.directMinutes,
                        gradient: 'directMinutes',
                    },
                    {
                        label: 'Органика',
                        data: points.map((p) => p.directOrganicMinutes),
                        color: CHART_COLORS.directOrganicMinutes,
                        gradient: 'directOrganicMinutes',
                    },
                ],
            },
        }

        if (map[selectedChartMetric]) {
            return map[selectedChartMetric]
        }

        return {
            formatter: 'currency',
            datasets: [
                {
                    label: 'Всего',
                    data: points.map((point) => point.totalRevenue),
                    color: CHART_COLORS.total,
                    gradient: 'total',
                    borderWidth: 3,
                    hidden: false,
                },
                {
                    label: 'РСЯ',
                    data: points.map((point) => point.yandexAds),
                    color: CHART_COLORS.yandexAds,
                    gradient: 'yandex',
                    hidden: true,
                },
                {
                    label: 'Внешние сети',
                    data: points.map((point) => point.externalAds),
                    color: CHART_COLORS.externalAds,
                    gradient: 'external',
                    hidden: true,
                },
                {
                    label: 'In-app',
                    data: points.map((point) => point.inApp),
                    color: CHART_COLORS.inApp,
                    gradient: 'inApp',
                    hidden: true,
                },
            ],
        }
    }

    _createChartGradients(ctx) {
        const createGradient = (color, opacityTop = 0.3, opacityMid = 0.1) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, 300)
            gradient.addColorStop(0, hexToRgba(color, opacityTop))
            gradient.addColorStop(0.55, hexToRgba(color, opacityMid))
            gradient.addColorStop(1, hexToRgba(color, 0))
            return gradient
        }

        return {
            total: createGradient(CHART_COLORS.total, 0.22, 0.08),
            yandex: createGradient(CHART_COLORS.yandexAds),
            external: createGradient(CHART_COLORS.externalAds),
            inApp: createGradient(CHART_COLORS.inApp),
            players: createGradient(CHART_COLORS.players),
            playtime: createGradient(CHART_COLORS.playtime),
            directSpend: createGradient(CHART_COLORS.directSpend),
            directPlayers: createGradient(CHART_COLORS.directPlayers),
            directMinutes: createGradient(CHART_COLORS.directMinutes),
            directOrganicPlayers: createGradient(CHART_COLORS.directOrganicPlayers),
            directOrganicMinutes: createGradient(CHART_COLORS.directOrganicMinutes),
        }
    }

    _createDatasetConfig(dataset, gradients) {
        return {
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.color,
            backgroundColor: gradients[dataset.gradient] || hexToRgba(dataset.color, 0.18),
            fill: true,
            tension: 0.35,
            borderWidth: dataset.borderWidth || 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 14,
            hidden: Boolean(dataset.hidden),
        }
    }

    _getChartOptions(formatter) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'rgba(255, 255, 255, 0.92)',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 16,
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (context) =>
                            `${context.dataset.label}: ${formatMetricValue(context.parsed.y || 0, formatter)}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.75)',
                        maxRotation: 0,
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.75)',
                        callback: (value) => formatAxisValue(value, formatter),
                    },
                },
            },
        }
    }
}
