// ArcZen Background Service Worker

// --- CONSTANTS ---
const FREE_SITE_LIMIT = 7;
const VPN_TRIAL_MINUTES = 10;
const PRO_CODES = ['ARCZEN-PRO-2026', 'ARCZEN-BETA-VIP', 'ZECORYX-UNLOCK']; // Valid codes

// VPN CONFIGURATION: REMOVED (Feature is visual-only "Coming Soon")
// PROXY_SERVER and VPN_CONFIG were deleted as they are not used.

// ---------------------------------------------

const BLOCKED_KEYWORDS = [
    'porn', 'porno', 'pornhub', 'xvideos', 'xnxx', 'xxx', 'sex', 'sexy',
    'nude', 'naked', 'hentai', 'adult', 'nsfw', 'onlyfans', 'brazzers',
    'xhamster', 'redtube', 'youporn', 'pornstar', 'erotic', 'fetish'
];

const SEARCH_ENGINES = [
    { name: 'Google', pattern: /google\.[a-z.]+\/search/i, queryParam: 'q' },
    { name: 'Bing', pattern: /bing\.com\/search/i, queryParam: 'q' },
    { name: 'Yandex', pattern: /yandex\.[a-z]+\/search/i, queryParam: 'text' },
    { name: 'YouTube', pattern: /youtube\.com\/results/i, queryParam: 'search_query' },
    { name: 'DuckDuckGo', pattern: /duckduckgo\.com/i, queryParam: 'q' }
];

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Open onboarding page
        chrome.tabs.create({
            url: chrome.runtime.getURL('onboarding/onboarding.html')
        });

        // Initialize storage
        await chrome.storage.local.set({
            isSetup: false,
            commitmentPassword: null,
            blockedSites: [],
            pendingRemovals: [],
            isPro: false, // Pro status
            vpnTrialStart: null, // VPN trial start timestamp
            stats: {
                totalBlocks: 0,
                todayBlocks: 0,
                lastBlockDate: null,
                hourlyBlocks: {},
                cleanStreak: 0,
                lastCleanDate: null
            },
            settings: {
                adBlockEnabled: true,
                vpnEnabled: false
            }
        });
    } else if (details.reason === 'update') {
        // Clear any lingering pending removals on update
        await chrome.storage.local.set({ pendingRemovals: [] });
    }
});

// Check if URL matches blocked sites
async function isBlockedSite(url) {
    try {
        // Maintenance Window: Unblock everything from 23:50 to 00:00 on last day of month
        if (isMaintenanceWindow()) {
            return false;
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');

        const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');

        for (const site of blockedSites) {
            if (hostname.includes(site) || site.includes(hostname)) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

// Check if search query contains blocked keywords
function hasBlockedKeywords(url) {
    try {
        const urlObj = new URL(url);
        const urlString = url.toLowerCase();

        // Check if it's a search engine
        for (const engine of SEARCH_ENGINES) {
            if (engine.pattern.test(urlString)) {
                const query = urlObj.searchParams.get(engine.queryParam);
                if (query) {
                    const queryLower = query.toLowerCase();
                    for (const keyword of BLOCKED_KEYWORDS) {
                        if (queryLower.includes(keyword)) {
                            return { blocked: true, keyword, engine: engine.name };
                        }
                    }
                }
            }
        }
        return { blocked: false };
    } catch (e) {
        return { blocked: false };
    }
}

// Record block attempt in stats
async function recordBlock(url) {
    const { stats = {} } = await chrome.storage.local.get('stats');
    const now = new Date();
    const today = now.toDateString();
    const hour = now.getHours();

    if (stats.lastBlockDate !== today) {
        stats.todayBlocks = 0;
        stats.lastBlockDate = today;
    }

    stats.totalBlocks = (stats.totalBlocks || 0) + 1;
    stats.todayBlocks = (stats.todayBlocks || 0) + 1;
    stats.hourlyBlocks = stats.hourlyBlocks || {};
    stats.hourlyBlocks[hour] = (stats.hourlyBlocks[hour] || 0) + 1;
    stats.cleanStreak = 0;

    await chrome.storage.local.set({ stats });
}

// Track Ad Block
async function recordAdBlock() {
    const { stats = {} } = await chrome.storage.local.get('stats');
    stats.adsBlockedCount = (stats.adsBlockedCount || 0) + 1;
    await chrome.storage.local.set({ stats });
    return stats.adsBlockedCount;
}

// Check Ad Limit (Pro users have unlimited)
async function checkAdLimit() {
    const { stats = {}, isPro = false } = await chrome.storage.local.get(['stats', 'isPro']);
    if (isPro) return true; // Pro = unlimited
    const count = stats.adsBlockedCount || 0;
    return count < 200;
}

// Check for maintenance window
function isMaintenanceWindow() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day === lastDay && hours === 23 && minutes >= 50) {
        return true;
    }
    return false;
}

// Pending removals logic removed (Strict Mode only)


// Navigation listener - block sites and searches
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

    const keywordCheck = hasBlockedKeywords(url);
    if (keywordCheck.blocked) {
        await recordBlock(url);
        chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL(`lockscreen/lockscreen.html?reason=search&keyword=${encodeURIComponent(keywordCheck.keyword)}&engine=${encodeURIComponent(keywordCheck.engine)}`)
        });
        return;
    }

    if (await isBlockedSite(url)) {
        await recordBlock(url);
        chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL(`lockscreen/lockscreen.html?reason=site&url=${encodeURIComponent(url)}`)
        });
        return;
    }
});

// No alarms needed for pending removals


// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // --- SITE MANAGEMENT ---
    if (request.action === 'addSite') {
        (async () => {
            const { blockedSites = [], isPro = false } = await chrome.storage.local.get(['blockedSites', 'isPro']);
            const site = request.site.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

            if (!site) {
                sendResponse({ success: false, error: 'empty' });
                return;
            }

            // Check 7-site limit for free users
            if (!isPro && blockedSites.length >= FREE_SITE_LIMIT) {
                sendResponse({ success: false, error: 'limit_reached' });
                return;
            }

            if (!blockedSites.includes(site)) {
                blockedSites.push(site);
                await chrome.storage.local.set({ blockedSites });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'already_exists' });
            }
        })();
        return true;
    }

    if (request.action === 'removeSite') {
        (async () => {
            const { commitmentPassword } = await chrome.storage.local.get('commitmentPassword');
            if (request.password !== commitmentPassword) {
                sendResponse({ success: false, error: 'wrong_password' });
                return;
            }

            // STRICT LOCK: Only allow removal during maintenance window
            if (isMaintenanceWindow()) {
                const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
                const site = request.site.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
                const index = blockedSites.indexOf(site);
                if (index > -1) {
                    blockedSites.splice(index, 1);
                    await chrome.storage.local.set({ blockedSites });
                    sendResponse({ success: true, immediate: true });
                } else {
                    sendResponse({ success: false, error: 'not_found' });
                }
            } else {
                // REJECT removal if not in window
                sendResponse({
                    success: false,
                    error: 'locked_until_maintenance',
                    message: "Locked! Only removable at end of month (23:50-00:00)."
                });
            }
        })();
        return true;
    }

    // cancelRemoval handler removed


    // --- INFO & STATS ---
    if (request.action === 'getStats') {
        (async () => {
            const { stats = {} } = await chrome.storage.local.get('stats');
            sendResponse(stats);
        })();
        return true;
    }

    if (request.action === 'getMaintenanceInfo') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const active = isMaintenanceWindow();
        sendResponse({
            isActive: active,
            lastDayOfMonth: lastDay,
            currentDay: now.getDate(),
            currentTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            message: active ? "MAINTENANCE ACTIVE: INSTANT CHANGES ALLOWED" : "LOCKED: 20 MIN DELAY FOR CHANGES"
        });
        return true;
    }

    if (request.action === 'checkFirstTime') {
        (async () => {
            const { isSetup } = await chrome.storage.local.get('isSetup');
            sendResponse({ isFirstTime: !isSetup });
        })();
        return true;
    }

    // --- VPN & AD BLOCKING ---
    if (request.action === 'adBlocked') {
        (async () => {
            await recordAdBlock();
            const limitStatus = await checkAdLimit();
            sendResponse({ continueBlocking: limitStatus });
        })();
        return true;
    }

    // VPN is now VISUAL ONLY (Coming Soon feature)
    if (request.action === 'toggleVPN') {
        (async () => {
            const { vpnEnabled } = await chrome.storage.local.get('vpnEnabled');
            const newState = !vpnEnabled;
            await chrome.storage.local.set({ vpnEnabled: newState });
            sendResponse({ success: true, enabled: newState });
        })();
        return true;
    }

    if (request.action === 'getVPNStatus') {
        (async () => {
            const { vpnEnabled, isPro = false } = await chrome.storage.local.get(['vpnEnabled', 'isPro']);
            sendResponse({
                enabled: !!vpnEnabled,
                isPro
            });
        })();
        return true;
    }

    // --- PRO CODE ACTIVATION ---
    if (request.action === 'activateProCode') {
        (async () => {
            const code = (request.code || '').toUpperCase().trim();

            if (PRO_CODES.includes(code)) {
                await chrome.storage.local.set({ isPro: true });
                sendResponse({ success: true, message: 'PRO ACTIVATED! ✨ All limits removed.' });
            } else {
                sendResponse({ success: false, error: 'invalid_code', message: 'Invalid code. Please check and try again.' });
            }
        })();
        return true;
    }

    if (request.action === 'getProStatus') {
        (async () => {
            const { isPro = false } = await chrome.storage.local.get('isPro');
            sendResponse({ isPro });
        })();
        return true;
    }
});


