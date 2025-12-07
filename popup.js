;(function () {
    'use strict'

    const VALIDATION = {
        MIN_DELAY: 100,
        MAX_DELAY: 5000,
    }

    const INTERVALS = {
        STATUS_HIDE_DELAY: 3000,
    }

    const DEFAULT_SETTINGS = {
        enabled: true,
        requestDelay: 500,
    }

    const enabledToggle = document.getElementById('enabled-toggle')
    const requestDelayInput = document.getElementById('request-delay')
    const saveButton = document.getElementById('save-button')
    const statusMessage = document.getElementById('status-message')

    function isValidDelay(value) {
        return (
            !isNaN(value) && value >= VALIDATION.MIN_DELAY && value <= VALIDATION.MAX_DELAY
        )
    }

    function normalizeDelay(value) {
        const parsed = parseInt(value, 10)

        if (Number.isNaN(parsed)) {
            return DEFAULT_SETTINGS.requestDelay
        }

        if (parsed < VALIDATION.MIN_DELAY) {
            return VALIDATION.MIN_DELAY
        }

        if (parsed > VALIDATION.MAX_DELAY) {
            return VALIDATION.MAX_DELAY
        }

        return parsed
    }

    function loadSettings() {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
            enabledToggle.checked = settings.enabled
            const normalizedDelay = normalizeDelay(settings.requestDelay)
            requestDelayInput.value = normalizedDelay

            if (normalizedDelay !== settings.requestDelay) {
                chrome.storage.sync.set({ requestDelay: normalizedDelay })
            }
        })
    }

    function saveSettings() {
        const delayValue = parseInt(requestDelayInput.value, 10)

        if (!isValidDelay(delayValue)) {
            showStatus(
                `Задержка должна быть числом от ${VALIDATION.MIN_DELAY} до ${VALIDATION.MAX_DELAY} мс`,
                'error',
            )
            return
        }

        const settings = {
            enabled: enabledToggle.checked,
            requestDelay: delayValue,
        }

        saveButton.disabled = true
        chrome.storage.sync.set(settings, () => {
            saveButton.disabled = false
            showStatus('Настройки сохранены! Обновите страницу.', 'success')
        })
    }

    function showStatus(message, type) {
        statusMessage.textContent = message
        statusMessage.className = `status-message show ${type}`

        setTimeout(() => {
            statusMessage.classList.remove('show')
        }, INTERVALS.STATUS_HIDE_DELAY)
    }

    function validateInput() {
        const value = parseInt(requestDelayInput.value, 10)

        if (!isValidDelay(value)) {
            requestDelayInput.setCustomValidity(
                `Значение должно быть от ${VALIDATION.MIN_DELAY} до ${VALIDATION.MAX_DELAY}`,
            )
        } else {
            requestDelayInput.setCustomValidity('')
        }
    }

    saveButton.addEventListener('click', saveSettings)

    requestDelayInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveSettings()
        }
    })

    requestDelayInput.addEventListener('input', validateInput)

    loadSettings()
})()
