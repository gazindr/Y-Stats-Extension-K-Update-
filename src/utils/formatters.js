import { CURRENCY } from '../config/constants.js'

export function formatMoney(amount) {
    return new Intl.NumberFormat(CURRENCY.LOCALE, {
        style: 'currency',
        currency: CURRENCY.CODE,
        minimumFractionDigits: CURRENCY.FRACTION_DIGITS,
        maximumFractionDigits: CURRENCY.FRACTION_DIGITS,
    }).format(amount)
}

export function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}
