import { LOGGER } from '../config/constants.js'

export class Logger {
    static log(...args) {
        console.log(LOGGER.PREFIX, ...args)
    }

    static info(...args) {
        console.info(LOGGER.PREFIX, ...args)
    }

    static warn(...args) {
        console.warn(LOGGER.PREFIX, ...args)
    }

    static error(...args) {
        console.error(LOGGER.PREFIX, ...args)
    }
}

