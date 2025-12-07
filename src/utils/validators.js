import { API } from '../config/constants.js'

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

export function normalizeRequestDelay(value, defaultValue = API.REQUEST_DELAY) {
    const parsed = parseInt(value, 10)
    if (Number.isNaN(parsed)) {
        return defaultValue
    }
    return clamp(parsed, 100, 5000)
}

export function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') {
        return ''
    }
    
    const sanitized = str
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, maxLength)
    
    return sanitized
}

export function validateGameId(id) {
    if (!id) return '-'
    return sanitizeString(String(id), 50)
}

export function validateGameName(name) {
    if (!name) return 'Неизвестная игра'
    return sanitizeString(String(name), 100)
}

export function isValidDelay(value) {
    return !isNaN(value) && value >= 100 && value <= 5000
}
