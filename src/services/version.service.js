import { VERSION } from '../config/constants.js'
import { Logger } from './logger.service.js'

function parseSemver(value) {
    if (typeof value !== 'string') {
        return null
    }

    return value
        .split('.')
        .map((part) => Number.parseInt(part, 10))
        .filter((num) => Number.isFinite(num))
}

function compareVersions(a, b) {
    const parsedA = parseSemver(a)
    const parsedB = parseSemver(b)

    if (!parsedA || !parsedB) {
        return 0
    }

    const length = Math.max(parsedA.length, parsedB.length)

    for (let i = 0; i < length; i++) {
        const partA = parsedA[i] || 0
        const partB = parsedB[i] || 0

        if (partA > partB) return 1
        if (partA < partB) return -1
    }

    return 0
}

async function readCache() {
    if (!chrome?.storage?.local) {
        return null
    }

    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get([VERSION.CACHE_KEY], (result) => {
                if (chrome.runtime?.lastError) {
                    reject(chrome.runtime.lastError)
                    return
                }

                resolve(result[VERSION.CACHE_KEY] || null)
            })
        } catch (error) {
            reject(error)
        }
    })
}

async function writeCache(version) {
    if (!chrome?.storage?.local) {
        return
    }

    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(
                {
                    [VERSION.CACHE_KEY]: {
                        version,
                        timestamp: Date.now(),
                    },
                },
                () => {
                    if (chrome.runtime?.lastError) {
                        reject(chrome.runtime.lastError)
                        return
                    }

                    resolve()
                },
            )
        } catch (error) {
            reject(error)
        }
    })
}

function isCacheValid(cache) {
    if (!cache || !cache.version || !cache.timestamp) {
        return false
    }

    return Date.now() - cache.timestamp < VERSION.CACHE_TTL_MS
}

async function fetchRemoteVersion() {
    try {
        const response = await fetch(VERSION.MANIFEST_URL, { cache: 'no-store' })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        if (data && typeof data.version === 'string') {
            return data.version
        }

        throw new Error('Version not found in manifest')
    } catch (error) {
        Logger.warn('Cannot fetch remote version (this is normal in dev):', error.message)
        return null
    }
}

export class VersionService {
    static async getLocalVersion() {
        try {
            const manifest = chrome?.runtime?.getManifest?.()
            return manifest?.version || null
        } catch (error) {
            Logger.error('Local version error:', error)
            return null
        }
    }

    static async getRemoteVersion() {
        try {
            const cache = await readCache()
            if (isCacheValid(cache)) {
                return cache.version
            }
        } catch (error) {
            Logger.warn('Cache read error:', error.message)
        }

        const version = await fetchRemoteVersion()
        
        if (!version) {
            return null
        }

        try {
            await writeCache(version)
        } catch (error) {
            Logger.warn('Cache write error:', error.message)
        }

        return version
    }

    static async checkVersion() {
        const currentVersion = await this.getLocalVersion()

        try {
            const remoteVersion = await this.getRemoteVersion()
            
            if (!remoteVersion) {
                return {
                    status: 'unknown',
                    currentVersion,
                    remoteVersion: null,
                    url: VERSION.REPO_URL,
                }
            }
            
            const comparison = compareVersions(remoteVersion, currentVersion)

            if (comparison > 0) {
                return {
                    status: 'update-available',
                    currentVersion,
                    remoteVersion,
                    url: VERSION.REPO_URL,
                }
            }

            return {
                status: 'up-to-date',
                currentVersion,
                remoteVersion,
                url: VERSION.REPO_URL,
            }
        } catch (error) {
            Logger.warn('Version check failed:', error.message)

            return {
                status: 'error',
                currentVersion,
                remoteVersion: null,
                url: VERSION.REPO_URL,
            }
        }
    }
}

