import { CURRENCY } from '../config/constants.js'

export function formatMoney(amount) {
    return new Intl.NumberFormat(CURRENCY.LOCALE, {
        style: 'currency',
        currency: CURRENCY.CODE,
        minimumFractionDigits: CURRENCY.FRACTION_DIGITS,
        maximumFractionDigits: CURRENCY.FRACTION_DIGITS,
    }).format(amount || 0)
}

export function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export function formatMonth(date) {
    return date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
    })
}

const MILLION = 1_000_000
const THOUSAND = 1_000

export function formatCompactNumber(value) {
    const normalized = Number(value) || 0

    if (normalized >= MILLION) {
        return (normalized / MILLION).toFixed(1) + 'M'
    }

    if (normalized >= THOUSAND) {
        return (normalized / THOUSAND).toFixed(1) + 'K'
    }

    return Math.round(normalized).toString()
}

export function formatShortDate(date) {
    const day = date.getUTCDate()
    const month = date.getUTCMonth() + 1
    return `${day}.${month < 10 ? '0' + month : month}`
}

export function formatMonthShort(date) {
    return date.toLocaleDateString('ru-RU', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

export function formatDateRange(start, end) {
    return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatWeekRange(start, end) {
    return `${formatShortDate(start)} — ${formatShortDate(end)}`
}

export function formatMinutes(minutes) {
    const normalized = Math.max(0, Math.round(Number(minutes) || 0))
    const hours = Math.floor(normalized / 60)
    const restMinutes = normalized % 60

    if (hours === 0) {
        return `${restMinutes} мин`
    }

    if (restMinutes === 0) {
        return `${hours} ч`
    }

    return `${hours} ч ${restMinutes} мин`
}

export function formatMetricValue(value, formatter = 'number') {
    if (formatter === 'currency') {
        return formatMoney(value)
    }

    if (formatter === 'minutes') {
        return formatMinutes(value)
    }

    return (Number(value) || 0).toLocaleString('ru-RU')
}

export function formatAxisValue(value, formatter = 'number') {
    if (formatter === 'currency') {
        return formatCompactNumber(value)
    }

    if (formatter === 'minutes') {
        const normalized = Number(value) || 0
        if (normalized >= 60) {
            return `${Math.round(normalized / 60)}ч`
        }

        return `${Math.round(normalized)}м`
    }

    return formatCompactNumber(value)
}

export function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function calculateRevenuePerPlayer(revenue, players) {
    if (!players || players === 0) return 0
    return revenue / players
}
