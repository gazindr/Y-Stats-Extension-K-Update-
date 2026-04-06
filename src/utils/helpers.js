import {
    CHART,
    GROUPING,
    METRIC_DEFINITIONS,
    PATHS,
    REVENUE_SERIES_IDS,
} from '../config/constants.js'
import {
    calculateRevenuePerPlayer,
    formatDate,
    formatMonthShort,
    formatShortDate,
    formatWeekRange,
} from './formatters.js'

const NUMERIC_FIELDS = [
    'totalRevenue',
    'yandexAds',
    'externalAds',
    'inApp',
    'players',
    'playtimeMinutes',
    'playtimePerPlayer',
    'directSpend',
    'directPlayers',
    'directOrganicPlayers',
    'directMinutes',
    'directOrganicMinutes',
]

export function isApplicationsPage(path = window.location.pathname) {
    return path === PATHS.APPLICATIONS || path === PATHS.APPLICATIONS_WITH_SLASH
}

function normalizeSeriesId(value) {
    if (!value) return ''

    return String(value)
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

function matchesAnySeriesId(value, expectedIds = []) {
    const normalizedValue = normalizeSeriesId(value)
    return expectedIds.some((item) => normalizeSeriesId(item) === normalizedValue)
}

function createEmptyPoint(timestamp = null) {
    return {
        timestamp,
        totalRevenue: 0,
        yandexAds: 0,
        externalAds: 0,
        inApp: 0,
        players: 0,
        playtimeMinutes: 0,
        playtimePerPlayer: 0,
        directSpend: 0,
        directPlayers: 0,
        directOrganicPlayers: 0,
        directMinutes: 0,
        directOrganicMinutes: 0,
    }
}

function normalizeMetricTimestamp(timestamp) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
        return null
    }

    return getDayStart(timestamp)
}

function getPointValueAtTimestamp(data, timestamp = null) {
    if (!Array.isArray(data) || data.length === 0) {
        return 0
    }

    const point =
        timestamp === null
            ? data[data.length - 1]
            : data.find((item) => normalizeMetricTimestamp(item?.x) === timestamp)

    return typeof point?.y === 'number' ? point.y : 0
}

function sumPointsInRange(data, start, end) {
    if (!Array.isArray(data) || data.length === 0) {
        return 0
    }

    return data
        .filter((point) => {
            const normalizedTimestamp = normalizeMetricTimestamp(point?.x)
            return (
                normalizedTimestamp !== null &&
                normalizedTimestamp >= start &&
                normalizedTimestamp <= end &&
                typeof point?.y === 'number'
            )
        })
        .reduce((sum, point) => sum + point.y, 0)
}

function getTotalSeries(series) {
    if (!Array.isArray(series) || series.length === 0) {
        return []
    }

    const matching = series.filter((serie) => {
        const descriptor = [serie?.id, serie?.name, serie?.title]
            .filter(Boolean)
            .map((item) => normalizeSeriesId(item))
            .join(' ')

        return (
            matchesAnySeriesId(serie?.id, CHART.TOTAL_SERIES_IDS) ||
            descriptor.includes('всего') ||
            descriptor.includes('total')
        )
    })

    if (matching.length > 0) {
        return matching
    }

    if (series.length === 1) {
        return series
    }

    const nonEmpty = series.filter((serie) => Array.isArray(serie?.data) && serie.data.length > 0)
    return nonEmpty.length > 0 ? [nonEmpty[0]] : []
}

function getSeriesByIds(series, expectedIds = []) {
    if (!Array.isArray(series) || series.length === 0) {
        return []
    }

    return series.filter((serie) => matchesAnySeriesId(serie?.id, expectedIds))
}

function extractRevenue(series, timestamp = null) {
    const result = {
        yandexAds: 0,
        externalAds: 0,
        inApp: 0,
    }

    if (!Array.isArray(series) || series.length === 0) {
        return result
    }

    for (const serie of series) {
        if (!Array.isArray(serie?.data) || serie.data.length === 0) {
            continue
        }

        const value = getPointValueAtTimestamp(serie.data, timestamp)
        const descriptor = [serie?.id, serie?.name, serie?.title]
            .filter(Boolean)
            .map((item) => normalizeSeriesId(item))
            .join(' ')

        if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.YANDEX_ADS) ||
            descriptor.includes('яндекс') ||
            descriptor.includes('yandex')
        ) {
            result.yandexAds += value
        } else if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.EXTERNAL_ADS) ||
            descriptor.includes('внешн') ||
            descriptor.includes('external')
        ) {
            result.externalAds += value
        } else if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.IN_APP) ||
            descriptor.includes('инап') ||
            descriptor.includes('in-app') ||
            descriptor.includes('in app')
        ) {
            result.inApp += value
        }
    }

    if (result.yandexAds === 0 && result.externalAds === 0 && result.inApp === 0) {
        const fallbackSeries = series.filter((serie) => Array.isArray(serie?.data) && serie.data.length > 0)
        if (fallbackSeries[0]) result.yandexAds = getPointValueAtTimestamp(fallbackSeries[0].data, timestamp)
        if (fallbackSeries[1]) result.externalAds = getPointValueAtTimestamp(fallbackSeries[1].data, timestamp)
        if (fallbackSeries[2]) result.inApp = getPointValueAtTimestamp(fallbackSeries[2].data, timestamp)
    }

    return result
}

function extractRevenueInRange(series, start, end) {
    const result = {
        yandexAds: 0,
        externalAds: 0,
        inApp: 0,
    }

    if (!Array.isArray(series) || series.length === 0) {
        return result
    }

    for (const serie of series) {
        if (!Array.isArray(serie?.data) || serie.data.length === 0) {
            continue
        }

        const value = sumPointsInRange(serie.data, start, end)
        const descriptor = [serie?.id, serie?.name, serie?.title]
            .filter(Boolean)
            .map((item) => normalizeSeriesId(item))
            .join(' ')

        if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.YANDEX_ADS) ||
            descriptor.includes('яндекс') ||
            descriptor.includes('yandex')
        ) {
            result.yandexAds += value
        } else if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.EXTERNAL_ADS) ||
            descriptor.includes('внешн') ||
            descriptor.includes('external')
        ) {
            result.externalAds += value
        } else if (
            matchesAnySeriesId(descriptor, REVENUE_SERIES_IDS.IN_APP) ||
            descriptor.includes('инап') ||
            descriptor.includes('in-app') ||
            descriptor.includes('in app')
        ) {
            result.inApp += value
        }
    }

    if (result.yandexAds === 0 && result.externalAds === 0 && result.inApp === 0) {
        const fallbackSeries = series.filter((serie) => Array.isArray(serie?.data) && serie.data.length > 0)
        if (fallbackSeries[0]) result.yandexAds = sumPointsInRange(fallbackSeries[0].data, start, end)
        if (fallbackSeries[1]) result.externalAds = sumPointsInRange(fallbackSeries[1].data, start, end)
        if (fallbackSeries[2]) result.inApp = sumPointsInRange(fallbackSeries[2].data, start, end)
    }

    return result
}

function extractNumericMetric(series, timestamp = null) {
    const matchingSeries = getTotalSeries(series)
    return matchingSeries.reduce((sum, serie) => {
        return sum + getPointValueAtTimestamp(serie.data, timestamp)
    }, 0)
}

function extractNumericMetricInRange(series, start, end) {
    const matchingSeries = getTotalSeries(series)
    return matchingSeries.reduce((sum, serie) => {
        return sum + sumPointsInRange(serie.data, start, end)
    }, 0)
}

function extractPromotionMetric(series, metricKey, timestamp = null) {
    const promotionSeriesMap = {
        directSpend: ['secondary_cost'],
        directPlayers: ['promo_y'],
        directOrganicPlayers: ['not_promo_y'],
        directMinutes: ['promo_y'],
        directOrganicMinutes: ['not_promo_y'],
    }

    const expectedIds = promotionSeriesMap[metricKey]
    if (!expectedIds) {
        return extractNumericMetric(series, timestamp)
    }

    const matchingSeries = getSeriesByIds(series, expectedIds)
    return matchingSeries.reduce((sum, serie) => {
        return sum + getPointValueAtTimestamp(serie.data, timestamp)
    }, 0)
}

function extractPromotionMetricInRange(series, metricKey, start, end) {
    const promotionSeriesMap = {
        directSpend: ['secondary_cost'],
        directPlayers: ['promo_y'],
        directOrganicPlayers: ['not_promo_y'],
        directMinutes: ['promo_y'],
        directOrganicMinutes: ['not_promo_y'],
    }

    const expectedIds = promotionSeriesMap[metricKey]
    if (!expectedIds) {
        return extractNumericMetricInRange(series, start, end)
    }

    const matchingSeries = getSeriesByIds(series, expectedIds)
    return matchingSeries.reduce((sum, serie) => {
        return sum + sumPointsInRange(serie.data, start, end)
    }, 0)
}

function getMetricDataAt(rawData, metricKey, gameIndex) {
    return rawData?.metricData?.[metricKey]?.[gameIndex] || null
}

export function getCollectedMetricKeys(collectionOptions = {}) {
    const keys = ['revenue']

    if (collectionOptions.includePlayers) {
        keys.push('players')
    }

    if (collectionOptions.includePlaytime) {
        keys.push('playtime')
        keys.push('playtimePerPlayer')
    }

    if (collectionOptions.includePromotion) {
        keys.push(
            'directSpend',
            'directPlayers',
            'directOrganicPlayers',
            'directMinutes',
            'directOrganicMinutes',
        )
    }

    return keys
}

export function getChartMetricOptions(collectionOptions = {}) {
    const options = [{ key: 'revenue', label: 'Доход', formatter: 'currency' }]

    if (collectionOptions.includePlayers) {
        options.push({ key: 'players', label: 'Игроки', formatter: 'number' })
    }

    if (collectionOptions.includePlaytime) {
        options.push({ key: 'playtime', label: 'Плейтайм', formatter: 'minutes' })
        options.push({
            key: 'playtimePerPlayer',
            label: 'Плейтайм на игрока',
            formatter: 'minutes',
        })
    }

    if (collectionOptions.includePromotion) {
        options.push({ key: 'directSpend', label: 'Продвижение: траты', formatter: 'currency' })
        options.push({ key: 'directPlayers', label: 'Продвижение: игроки', formatter: 'number' })
        options.push({
            key: 'directMinutes',
            label: 'Продвижение: минуты',
            formatter: 'minutes',
        })
    }

    return options
}

export function getSelectedGameIndexes(gamesInfo = [], selectedGameIds = null, selectedAccountIds = null) {
    const gameFilterActive = selectedGameIds instanceof Set
    const accountFilterActive = selectedAccountIds instanceof Set

    return gamesInfo
        .map((game, index) => ({ game, index }))
        .filter(({ game }) => {
            const matchesGame = !gameFilterActive || selectedGameIds.has(String(game.id))
            const matchesAccount =
                !accountFilterActive || selectedAccountIds.has(String(game.accountId))

            return matchesGame && matchesAccount
        })
        .map(({ index }) => index)
}

function forEachMetricSeries(metricDataArray = [], selectedIndexes = [], callback) {
    for (const index of selectedIndexes) {
        const entry = metricDataArray[index]
        const series = entry?.options?.series

        if (!Array.isArray(series) || series.length === 0) {
            continue
        }

        callback(series, index, entry)
    }
}

export function findLatestTimestamp(metricData = {}, metricKeys = [], selectedIndexes = []) {
    let result = null

    for (const metricKey of metricKeys) {
        const metricArray = metricData[metricKey] || []

        forEachMetricSeries(metricArray, selectedIndexes, (series) => {
            for (const serie of series) {
                for (const point of serie?.data || []) {
                    if (!point?.x) continue
                    const normalizedTimestamp = normalizeMetricTimestamp(point.x)
                    if (normalizedTimestamp === null) continue
                    if (result === null || normalizedTimestamp > result) {
                        result = normalizedTimestamp
                    }
                }
            }
        })
    }

    return result
}

export function findEarliestTimestamp(metricData = {}, metricKeys = [], selectedIndexes = []) {
    let result = null

    for (const metricKey of metricKeys) {
        const metricArray = metricData[metricKey] || []

        forEachMetricSeries(metricArray, selectedIndexes, (series) => {
            for (const serie of series) {
                for (const point of serie?.data || []) {
                    if (!point?.x) continue
                    const normalizedTimestamp = normalizeMetricTimestamp(point.x)
                    if (normalizedTimestamp === null) continue
                    if (result === null || normalizedTimestamp < result) {
                        result = normalizedTimestamp
                    }
                }
            }
        })
    }

    return result
}

function collectTimestamps(metricData = {}, metricKeys = [], selectedIndexes = [], range) {
    const timestamps = new Set()

    for (const metricKey of metricKeys) {
        const metricArray = metricData[metricKey] || []

        forEachMetricSeries(metricArray, selectedIndexes, (series) => {
            for (const serie of series) {
                for (const point of serie?.data || []) {
                    if (!point?.x) continue
                    const normalizedTimestamp = normalizeMetricTimestamp(point.x)
                    if (normalizedTimestamp === null) continue
                    if (range && (normalizedTimestamp < range.start || normalizedTimestamp > range.end)) {
                        continue
                    }

                    timestamps.add(normalizedTimestamp)
                }
            }
        })
    }

    return Array.from(timestamps).sort((a, b) => a - b)
}

export function aggregateMetricPoint(rawData, timestamp, selectedIndexes = [], metricKeys = []) {
    const point = createEmptyPoint(timestamp)

    if (metricKeys.includes('revenue')) {
        for (const index of selectedIndexes) {
            const revenueData = getMetricDataAt(rawData, 'revenue', index)
            const series = revenueData?.options?.series
            const revenue = extractRevenue(series, timestamp)

            point.yandexAds += revenue.yandexAds
            point.externalAds += revenue.externalAds
            point.inApp += revenue.inApp
        }

        point.totalRevenue = point.yandexAds + point.externalAds + point.inApp
    }

    for (const metricKey of metricKeys) {
        if (metricKey === 'revenue') {
            continue
        }

        const definition = METRIC_DEFINITIONS[metricKey]
        if (!definition?.valueField) {
            continue
        }

        for (const index of selectedIndexes) {
            const metricEntry = getMetricDataAt(rawData, metricKey, index)
            const series = metricEntry?.options?.series
            const value =
                definition?.endpoint === 'promo'
                    ? extractPromotionMetric(series, metricKey, timestamp)
                    : extractNumericMetric(series, timestamp)

            point[definition.valueField] += value
        }
    }

    point.playtimePerPlayer =
        point.players > 0 ? point.playtimeMinutes / point.players : 0

    return point
}

export function buildDailyMetricPoints(rawData, range, selectedIndexes = [], metricKeys = []) {
    const timestamps = collectTimestamps(rawData?.metricData, metricKeys, selectedIndexes, range)
    return timestamps.map((timestamp) =>
        aggregateMetricPoint(rawData, timestamp, selectedIndexes, metricKeys),
    )
}

function getDayStart(timestamp) {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function getWeekStart(timestamp) {
    const dayStart = getDayStart(timestamp)
    const date = new Date(dayStart)
    const day = date.getUTCDay() || 7
    return dayStart - (day - 1) * 24 * 60 * 60 * 1000
}

function getMonthStart(timestamp) {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

function getBucketStart(timestamp, grouping) {
    if (grouping === GROUPING.WEEK) {
        return getWeekStart(timestamp)
    }

    if (grouping === GROUPING.MONTH) {
        return getMonthStart(timestamp)
    }

    return getDayStart(timestamp)
}

function getBucketEnd(start, grouping) {
    if (grouping === GROUPING.WEEK) {
        return start + 6 * 24 * 60 * 60 * 1000
    }

    if (grouping === GROUPING.MONTH) {
        const date = new Date(start)
        return Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
            999,
        )
    }

    return start + 24 * 60 * 60 * 1000 - 1
}

function getBucketLabel(start, end, grouping, range = null) {
    const displayStart = range ? new Date(Math.max(start, range.start)) : new Date(start)
    const displayEnd = range ? new Date(Math.min(end, range.end)) : new Date(end)

    if (grouping === GROUPING.WEEK) {
        return formatWeekRange(displayStart, displayEnd)
    }

    if (grouping === GROUPING.MONTH) {
        return formatMonthShort(displayStart)
    }

    return formatDate(displayStart)
}

export function groupMetricPoints(points = [], grouping = GROUPING.DAY, range = null) {
    if (grouping === GROUPING.DAY) {
        return points.map((point) => ({
            ...point,
            bucketStart: point.timestamp,
            bucketEnd: point.timestamp,
            rangeStart: point.timestamp,
            rangeEnd: point.timestamp,
            dateLabel: formatShortDate(new Date(point.timestamp)),
            fullLabel: formatDate(new Date(point.timestamp)),
        }))
    }

    const buckets = new Map()

    for (const point of points) {
        const bucketStart = getBucketStart(point.timestamp, grouping)
        const bucketEnd = getBucketEnd(bucketStart, grouping)
        const key = String(bucketStart)

        if (!buckets.has(key)) {
            const rangeStart = range ? Math.max(bucketStart, range.start) : bucketStart
            const rangeEnd = range ? Math.min(bucketEnd, range.end) : bucketEnd
            buckets.set(key, {
                ...createEmptyPoint(point.timestamp),
                bucketStart,
                bucketEnd,
                rangeStart,
                rangeEnd,
                dateLabel: getBucketLabel(bucketStart, bucketEnd, grouping, range),
                fullLabel: getBucketLabel(bucketStart, bucketEnd, grouping, range),
            })
        }

        const bucket = buckets.get(key)
        for (const field of NUMERIC_FIELDS) {
            bucket[field] += point[field] || 0
        }

        bucket.playtimePerPlayer =
            bucket.players > 0 ? bucket.playtimeMinutes / bucket.players : 0
    }

    return Array.from(buckets.values()).sort((a, b) => a.bucketStart - b.bucketStart)
}

export function createBucketOptions(groupedPoints = []) {
    return [...groupedPoints]
        .sort((a, b) => b.bucketStart - a.bucketStart)
        .map((point) => ({
            value: String(point.bucketStart),
            label: point.fullLabel,
            start: point.rangeStart ?? point.bucketStart,
            end: point.rangeEnd ?? point.bucketEnd,
        }))
}

export function summarizePoints(points = [], gamesCount = 0) {
    const lastPoint = points.length > 0 ? points[points.length - 1] : null
    const summary = createEmptyPoint(lastPoint?.timestamp || null)

    for (const point of points) {
        for (const field of NUMERIC_FIELDS) {
            summary[field] += point[field] || 0
        }
    }

    summary.playtimePerPlayer =
        summary.players > 0 ? summary.playtimeMinutes / summary.players : 0

    return {
        ...summary,
        amount: summary.totalRevenue,
        gamesCount,
    }
}

export function findBucketByStart(groupedPoints = [], bucketStart = null) {
    if (!bucketStart) {
        return null
    }

    return groupedPoints.find((point) => String(point.bucketStart) === String(bucketStart)) || null
}

export function prepareGamesTableData(
    rawData,
    gamesInfo = [],
    periodStart,
    periodEnd,
    selectedIndexes = [],
    collectionOptions = {},
) {
    const collectedMetricKeys = getCollectedMetricKeys(collectionOptions)

    return selectedIndexes.map((index) => {
        const gameInfo = gamesInfo[index] || {
            id: 'unknown',
            name: 'Неизвестная игра',
            url: '#',
            accountName: 'Неизвестный аккаунт',
        }

        const row = {
            id: gameInfo.id,
            name: gameInfo.name,
            url: gameInfo.url,
            accountName: gameInfo.accountName,
            totalRevenue: 0,
            yandexAds: 0,
            externalAds: 0,
            inApp: 0,
            players: 0,
            playtimeMinutes: 0,
            playtimePerPlayer: 0,
            directSpend: 0,
            directPlayers: 0,
            directOrganicPlayers: 0,
            directMinutes: 0,
            directOrganicMinutes: 0,
            revenuePerPlayer: 0,
        }

        if (collectedMetricKeys.includes('revenue')) {
            const revenueSeries = getMetricDataAt(rawData, 'revenue', index)?.options?.series
            const revenue = extractRevenueInRange(revenueSeries, periodStart, periodEnd)

            row.yandexAds = revenue.yandexAds
            row.externalAds = revenue.externalAds
            row.inApp = revenue.inApp
            row.totalRevenue = revenue.yandexAds + revenue.externalAds + revenue.inApp
        }

        for (const metricKey of collectedMetricKeys) {
            if (metricKey === 'revenue') {
                continue
            }

            const definition = METRIC_DEFINITIONS[metricKey]
            const series = getMetricDataAt(rawData, metricKey, index)?.options?.series
            row[definition.valueField] =
                definition?.endpoint === 'promo'
                    ? extractPromotionMetricInRange(series, metricKey, periodStart, periodEnd)
                    : extractNumericMetricInRange(series, periodStart, periodEnd)
        }

        row.revenuePerPlayer = calculateRevenuePerPlayer(row.totalRevenue, row.players)
        row.playtimePerPlayer =
            row.players > 0 ? row.playtimeMinutes / row.players : 0
        return row
    })
}

export function sortGamesTableData(tableData = [], sortBy, sortOrder = 'desc') {
    return [...tableData].sort((a, b) => {
        const aValue = a?.[sortBy]
        const bValue = b?.[sortBy]

        if (typeof aValue === 'string' || typeof bValue === 'string') {
            return sortOrder === 'asc'
                ? String(aValue || '').localeCompare(String(bValue || ''), 'ru')
                : String(bValue || '').localeCompare(String(aValue || ''), 'ru')
        }

        const normalizedA = Number(aValue) || 0
        const normalizedB = Number(bValue) || 0
        return sortOrder === 'asc' ? normalizedA - normalizedB : normalizedB - normalizedA
    })
}
