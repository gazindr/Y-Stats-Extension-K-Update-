;(async function () {
    'use strict'

    try {
        const { App } = await import(chrome.runtime.getURL('src/app.js'))
        const { isApplicationsPage } = await import(chrome.runtime.getURL('src/utils/helpers.js'))

        function initApp() {
            if (isApplicationsPage() || window.location.hostname === 'games.yandex.ru') {
                const app = new App()
                window.__yandexStatsApp = app

                app.init().catch((error) => {
                    console.error('[Y-Stats-Extension] Ошибка при инициализации приложения:', error)
                })

                console.log('[Y-Stats-Extension] Расширение инициализировано')
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp)
        } else {
            initApp()
        }
    } catch (error) {
        console.error('[Y-Stats-Extension] Ошибка при загрузке модулей:', error)
    }
})()
