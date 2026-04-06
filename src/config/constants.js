export const SELECTORS = {
    MAIN_CONTAINER: 'main.main',
    APPS_HEADER: '.apps-header',
    PAGE_CONTAINER: '.page.page_full-height.page_width_full',
    STATS_BLOCK_ID: 'yandex-stats-extension',
}

export const TIMINGS = {
    INIT_DELAY: 100,
    INIT_RETRY_INTERVAL: 500,
    MAX_INIT_ATTEMPTS: 10,
    OBSERVER_START_DELAY: 2000,
    PERIODIC_CHECK_INTERVAL: 5000,
}

export const CURRENCY = {
    LOCALE: 'ru-RU',
    CODE: 'RUB',
    FRACTION_DIGITS: 2,
}

export const API = {
    BASE_URL: 'https://games.yandex.ru',
    ENDPOINTS: {
        APPLICATIONS: '/console/api/applications',
        CHARTKIT: '/console/api/chartkit',
        PROMO: '/console/api/metrics-engine/promo/data',
        CONSOLE: '/console/applications',
    },
    PARAMS: {
        PAGE_SIZE: 100,
        PAGE_NUMBER: 0,
        FILTER_FIELD_STATUS: 'status:published',
        FILTER_FIELD_HIDE_DRAFTS: 'hide-delete-drafts:true',
        FILTER_MODE: 'and',
        ORDER_BY: 'ru_and_close_overseas_rating:desc',
    },
    HEADERS: {
        ACCEPT: '*/*',
        ACCEPT_LANGUAGE: 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
        CACHE_CONTROL: 'no-cache',
        PRAGMA: 'no-cache',
    },
    REQUEST_DELAY: 500,
}

export const CHART = {
    TOTAL_SERIES_IDS: ['Всего', 'Total', 'всего', 'total'],
    LANG: 'ru',
    MOBILE_SLICE: '__total__',
    COUNTRY_SLICE: '__total__',
}

export const METRIC_DEFINITIONS = {
    revenue: {
        key: 'revenue',
        slug: 'purchase_amount',
        type: 'revenue-breakdown',
        label: 'Доход',
    },
    players: {
        key: 'players',
        slug: 'players',
        type: 'numeric-total',
        valueField: 'players',
        label: 'Игроки',
    },
    playtime: {
        key: 'playtime',
        slug: 'play_time',
        type: 'numeric-total',
        valueField: 'playtimeMinutes',
        label: 'Плейтайм',
    },
    playtimePerPlayer: {
        key: 'playtimePerPlayer',
        slug: 'play_time_for_player',
        type: 'numeric-total',
        valueField: 'playtimePerPlayer',
        label: 'Плейтайм на игрока',
    },
    directSpend: {
        key: 'directSpend',
        slug: 'players',
        endpoint: 'promo',
        type: 'numeric-total',
        valueField: 'directSpend',
        label: 'Промо: траты',
    },
    directPlayers: {
        key: 'directPlayers',
        slug: 'players',
        endpoint: 'promo',
        type: 'numeric-total',
        valueField: 'directPlayers',
        label: 'Промо: игроки',
    },
    directOrganicPlayers: {
        key: 'directOrganicPlayers',
        slug: 'players',
        endpoint: 'promo',
        type: 'numeric-total',
        valueField: 'directOrganicPlayers',
        label: 'Органика: игроки',
    },
    directMinutes: {
        key: 'directMinutes',
        slug: 'playtime',
        endpoint: 'promo',
        type: 'numeric-total',
        valueField: 'directMinutes',
        label: 'Промо: минуты',
    },
    directOrganicMinutes: {
        key: 'directOrganicMinutes',
        slug: 'playtime',
        endpoint: 'promo',
        type: 'numeric-total',
        valueField: 'directOrganicMinutes',
        label: 'Органика: минуты',
    },
}

export const REVENUE_SERIES_IDS = {
    YANDEX_ADS: ['Рекламная сеть Яндекса', 'Yandex Ads', 'Yandex Advertising Network'],
    EXTERNAL_ADS: ['Внешние рекламные сети', 'External Ads', 'External Ad Networks'],
    IN_APP: ['Инап-покупки', 'In-app purchases', 'In-app Purchases'],
}

export const PATHS = {
    APPLICATIONS: '/console/applications',
    APPLICATIONS_WITH_SLASH: '/console/applications/',
}

export const PERIODS = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    MONTH_CURRENT: 'month_current',
    MONTH_PREV: 'month_prev',
    CUSTOM: 'custom',
    ALL_TIME: 'all-time',
}

export const GROUPING = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
}

export const MONITORING = {
    URL_CHECK_INTERVAL: 100,
    PERIODIC_CHECK_INTERVAL: 5000,
}

export const VERSION = {
    MANIFEST_URL:
        'https://raw.githubusercontent.com/VyacheslavDeveloper/Y-Stats-Extension/main/manifest.json',
    REPO_URL: 'https://github.com/VyacheslavDeveloper/Y-Stats-Extension',
    CACHE_KEY: 'ys_version_cache',
    CACHE_TTL_MS: 60 * 60 * 1000,
}

export const LOGGER = {
    PREFIX: '[Y-Stats-Extension]',
}

export const DATA_ATTRIBUTES = {
    LOAD_BUTTON: 'load-button',
    DATE: 'date',
    CONTENT: 'content',
    VERSION: 'version',
    PERIOD: 'period',
    TAB: 'tab',
    SORT: 'sort',
    DATE_SELECTOR: 'date-selector',
    LABEL: 'data-label',
}

export const DEFAULT_CHART_PERIOD = PERIODS.MONTH
export const DEFAULT_GROUPING = GROUPING.DAY
export const DEFAULT_CHART_METRIC = 'revenue'

export const DEFAULT_COLLECTION_OPTIONS = {
    includePlayers: true,
    includePlaytime: false,
    includePromotion: false,
}

export const CHART_COLORS = {
    total: '#ffffff',
    yandexAds: '#22C55E',
    externalAds: '#3B82F6',
    inApp: '#F97316',
    players: '#FACC15',
    playtime: '#A78BFA',
    directSpend: '#F87171',
    directPlayers: '#38BDF8',
    directMinutes: '#34D399',
    directOrganicPlayers: '#F59E0B',
    directOrganicMinutes: '#C084FC',
}
