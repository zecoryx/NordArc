/**
 * Repository layer for chrome.storage access.
 * Strictly handles data retrieval and persistence.
 */
export class StorageRepository {
    constructor() {
        this.cache = {
            blockedSites: new Set(),
            stats: {},
            settings: {},
            isPro: false,
            isSetup: false,
            initialized: false
        };
    }

    async initialize() {
        if (this.cache.initialized) return;
        
        try {
            const data = await chrome.storage.local.get(null);
            this.cache.blockedSites = new Set(data.blockedSites || []);
            this.cache.stats = data.stats || {};
            this.cache.settings = data.settings || {};
            this.cache.isPro = !!data.isPro;
            this.cache.isSetup = !!data.isSetup;
            this.cache.initialized = true;
        } catch (error) {
            console.error('StorageRepository: Init failed', error);
        }
    }

    async get(key) {
        await this.initialize();
        return this.cache[key];
    }

    async getAll() {
        await this.initialize();
        return { ...this.cache, blockedSites: Array.from(this.cache.blockedSites) };
    }

    async set(key, value) {
        await this.initialize();
        this.cache[key] = value;
        const storageValue = key === 'blockedSites' ? Array.from(value) : value;
        await chrome.storage.local.set({ [key]: storageValue });
    }

    async updateStats(updater) {
        await this.initialize();
        updater(this.cache.stats);
        await this.set('stats', this.cache.stats);
    }
}

export const storageRepo = new StorageRepository();
