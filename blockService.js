import { storageRepo } from './storageRepo.js';
import { LIMITS, BLOCKED_KEYWORDS, SEARCH_ENGINES, PRO_CODES_HASHED } from './constants.js';

/**
 * Service layer for business logic.
 * Orchestrates between controllers and storage.
 */
export class BlockService {
    async isSiteBlocked(url) {
        if (this.isMaintenanceWindow()) return false;

        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
            const blockedSites = await storageRepo.get('blockedSites');

            for (const site of blockedSites) {
                if (hostname === site || hostname.endsWith('.' + site)) return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    getBlockedKeyword(url) {
        try {
            const urlObj = new URL(url);
            const urlString = url.toLowerCase();

            for (const engine of SEARCH_ENGINES) {
                if (!engine.pattern.test(urlString)) continue;

                let query = urlObj.searchParams.get(engine.queryParam);
                if (!query) {
                    const backups = ['q', 'query', 'p', 's', 'term', 'keywords'];
                    for (const b of backups) {
                        const val = urlObj.searchParams.get(b);
                        if (val) { query = val; break; }
                    }
                }

                if (query) {
                    const queryLower = decodeURIComponent(query).toLowerCase();
                    for (const keyword of BLOCKED_KEYWORDS) {
                        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                        if (regex.test(queryLower) || queryLower.includes(keyword)) {
                            return { blocked: true, keyword, engine: engine.name };
                        }
                    }
                }
            }
        } catch (e) {}
        return { blocked: false };
    }

    async addSite(site) {
        const cleanSite = site.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        if (!cleanSite || cleanSite.length > 255) throw new Error('invalid');

        const [blockedSites, isPro] = await Promise.all([
            storageRepo.get('blockedSites'),
            storageRepo.get('isPro')
        ]);

        if (!isPro && blockedSites.size >= LIMITS.FREE_SITE_LIMIT) throw new Error('limit_reached');
        if (blockedSites.has(cleanSite)) throw new Error('already_exists');

        blockedSites.add(cleanSite);
        await storageRepo.set('blockedSites', blockedSites);
    }

    async removeSite(site, password) {
        const hash = await this.hashString(password || '');
        const storedHash = await storageRepo.get('commitmentPasswordHash');

        if (hash !== storedHash) throw new Error('wrong_password');
        if (!this.isMaintenanceWindow()) throw new Error('locked');

        const cleanSite = site.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        const blockedSites = await storageRepo.get('blockedSites');

        if (blockedSites.has(cleanSite)) {
            blockedSites.delete(cleanSite);
            await storageRepo.set('blockedSites', blockedSites);
        } else {
            throw new Error('not_found');
        }
    }

    async activatePro(code) {
        const hash = await this.hashString((code || '').toUpperCase().trim());
        if (PRO_CODES_HASHED.includes(hash)) {
            await storageRepo.set('isPro', true);
            return true;
        }
        return false;
    }

    isMaintenanceWindow() {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return now.getDate() === lastDay && now.getHours() === 23 && now.getMinutes() >= 50;
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async recordBlock() {
        await storageRepo.updateStats(stats => {
            const today = new Date().toDateString();
            const hour = new Date().getHours();

            if (stats.lastBlockDate !== today) {
                stats.todayBlocks = 0;
                stats.lastBlockDate = today;
            }
            stats.totalBlocks = (stats.totalBlocks || 0) + 1;
            stats.todayBlocks = (stats.todayBlocks || 0) + 1;
            stats.hourlyBlocks = stats.hourlyBlocks || {};
            stats.hourlyBlocks[hour] = (stats.hourlyBlocks[hour] || 0) + 1;
        });
    }
}

export const blockService = new BlockService();
