import { PATHS, REVENUE_SERIES_IDS } from '../config/constants.js'

export function isApplicationsPage(path = window.location.pathname) {
    return path === PATHS.APPLICATIONS || path === PATHS.APPLICATIONS_WITH_SLASH
}

export function extractRevenueFromSeries(series, revenueIds, timestamp = null) {
    let total = 0
    if (!series || !Array.isArray(series)) {
        return total
    }

    for (const serie of series) {
        if (!serie.data || serie.data.length === 0) {
            continue
        }

        const serieId = serie.id || ''
        if (!revenueIds.includes(serieId)) {
            continue
        }

        const dataPoint = timestamp
            ? serie.data.find((point) => point.x === timestamp)
            : serie.data[serie.data.length - 1]

        const value = dataPoint?.y
        if (typeof value === 'number') {
            total += value
        }
    }

    return total
}

export function findLatestTimestamp(chartkitDataArray) {
    let maxTimestamp = null

    for (const chartkitData of chartkitDataArray) {
        if (!chartkitData.options || !chartkitData.options.series) {
            continue
        }

        for (const serie of chartkitData.options.series) {
            if (!serie.data || serie.data.length === 0) {
                continue
            }

            for (const point of serie.data) {
                if (point && point.x) {
                    if (!maxTimestamp || point.x > maxTimestamp) {
                        maxTimestamp = point.x
                    }
                }
            }
        }
    }

    return maxTimestamp
}

export function findEarliestTimestamp(chartkitDataArray) {
    let minTimestamp = null

    for (const chartkitData of chartkitDataArray) {
        if (!chartkitData.options || !chartkitData.options.series) {
            continue
        }

        for (const serie of chartkitData.options.series) {
            if (!serie.data || serie.data.length === 0) {
                continue
            }

            for (const point of serie.data) {
                if (point && point.x) {
                    if (minTimestamp === null || point.x < minTimestamp) {
                        minTimestamp = point.x
                    }
                }
            }
        }
    }

    return minTimestamp
}

export function aggregateRevenueData(chartkitDataArray, timestamp = null) {
    let yandexAdsTotal = 0
    let externalAdsTotal = 0
    let inAppTotal = 0

    for (const chartkitData of chartkitDataArray) {
        if (!chartkitData.options || !chartkitData.options.series) {
            continue
        }

        const series = chartkitData.options.series

        yandexAdsTotal += extractRevenueFromSeries(series, REVENUE_SERIES_IDS.YANDEX_ADS, timestamp)
        externalAdsTotal += extractRevenueFromSeries(
            series,
            REVENUE_SERIES_IDS.EXTERNAL_ADS,
            timestamp,
        )
        inAppTotal += extractRevenueFromSeries(series, REVENUE_SERIES_IDS.IN_APP, timestamp)
    }

    const totalAmount = yandexAdsTotal + externalAdsTotal + inAppTotal

    return {
        yandexAds: yandexAdsTotal,
        externalAds: externalAdsTotal,
        inApp: inAppTotal,
        total: totalAmount,
    }
}

export function prepareGamesTableData(allGamesData, gamesInfo, periodStart, periodEnd, period = null) {
    return allGamesData.map((gameData, index) => {
        const gameInfo = gamesInfo[index] || {
            id: 'unknown',
            name: 'Неизвестная игра',
            url: '#',
        }

        if (!gameData.options || !gameData.options.series) {
            return {
                id: gameInfo.id,
                name: gameInfo.name,
                url: gameInfo.url,
                totalRevenue: 0,
                yandexAds: 0,
                externalAds: 0,
                inApp: 0,
            }
        }

        const series = gameData.options.series
        let yandexAds = 0
        let externalAds = 0
        let inApp = 0

        if (period === 'day') {
            yandexAds = extractRevenueFromSeries(series, REVENUE_SERIES_IDS.YANDEX_ADS, periodEnd)
            externalAds = extractRevenueFromSeries(
                series,
                REVENUE_SERIES_IDS.EXTERNAL_ADS,
                periodEnd,
            )
            inApp = extractRevenueFromSeries(series, REVENUE_SERIES_IDS.IN_APP, periodEnd)
        } else {
            series.forEach((serie) => {
                if (!serie.data || serie.data.length === 0) return

                const serieId = serie.id || ''

                const pointsInPeriod = serie.data
                    .filter(
                        (point) =>
                            point.x >= periodStart &&
                            point.x <= periodEnd &&
                            typeof point.y === 'number',
                    )
                    .sort((a, b) => a.x - b.x)

                if (pointsInPeriod.length === 0) return

                const value = pointsInPeriod.reduce((sum, point) => sum + (point.y || 0), 0)

                if (REVENUE_SERIES_IDS.YANDEX_ADS.includes(serieId)) {
                    yandexAds += value
                } else if (REVENUE_SERIES_IDS.EXTERNAL_ADS.includes(serieId)) {
                    externalAds += value
                } else if (REVENUE_SERIES_IDS.IN_APP.includes(serieId)) {
                    inApp += value
                }
            })
        }

        return {
            id: gameInfo.id,
            name: gameInfo.name,
            url: gameInfo.url,
            totalRevenue: yandexAds + externalAds + inApp,
            yandexAds,
            externalAds,
            inApp,
        }
    })
}

export function sortGamesTableData(tableData, sortBy, sortOrder = 'desc') {
    return [...tableData].sort((a, b) => {
        const aValue = a[sortBy]
        const bValue = b[sortBy]

        if (typeof aValue === 'string') {
            return sortOrder === 'asc'
                ? aValue.localeCompare(bValue, 'ru')
                : bValue.localeCompare(aValue, 'ru')
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
}

export function extractUniqueTimestamps(chartkitDataArray) {
    const timestampsSet = new Set()

    for (const chartkitData of chartkitDataArray) {
        if (!chartkitData.options || !chartkitData.options.series) {
            continue
        }

        for (const serie of chartkitData.options.series) {
            if (!serie.data || serie.data.length === 0) {
                continue
            }

            for (const point of serie.data) {
                if (point && point.x) {
                    timestampsSet.add(point.x)
                }
            }
        }
    }

    return Array.from(timestampsSet).sort((a, b) => b - a)
}
