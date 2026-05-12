import { storageRepo } from './storageRepo.js';
import { blockService } from './blockService.js';
import { MESSAGE_ACTIONS } from './constants.js';

/**
 * Controller layer (Entry Point).
 * Handles browser events and routes messages to services.
 */

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
        await chrome.storage.local.set({
            isSetup: false,
            commitmentPasswordHash: null,
            blockedSites: [],
            isPro: false,
            stats: { totalBlocks: 0, todayBlocks: 0, lastBlockDate: null, hourlyBlocks: {}, adsBlockedCount: 0 },
            settings: { adBlockEnabled: true }
        });
    }
    await storageRepo.initialize();
});

// Navigation Controller
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0 || !details.url.startsWith('http')) return;

    try {
        const url = details.url;
        const keywordCheck = blockService.getBlockedKeyword(url);

        if (keywordCheck.blocked) {
            await blockService.recordBlock();
            const blockId = Math.random().toString(36).substring(2);
            await chrome.storage.session.set({ [`block_${blockId}`]: { reason: 'search', keyword: keywordCheck.keyword, engine: keywordCheck.engine } });
            chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`lockscreen/lockscreen.html?id=${blockId}`) });
            return;
        }

        if (await blockService.isSiteBlocked(url)) {
            await blockService.recordBlock();
            const blockId = Math.random().toString(36).substring(2);
            await chrome.storage.session.set({ [`block_${blockId}`]: { reason: 'site', url: url } });
            chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`lockscreen/lockscreen.html?id=${blockId}`) });
        }
    } catch (error) {
        console.error('Background: Navigation handling failed', error);
    }
});

// Message Router (Controller)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const routeMessage = async () => {
        try {
            switch (request.action) {
                case MESSAGE_ACTIONS.ADD_SITE:
                    await blockService.addSite(request.site);
                    return { success: true };
                case MESSAGE_ACTIONS.REMOVE_SITE:
                    await blockService.removeSite(request.site, request.password);
                    return { success: true };
                case MESSAGE_ACTIONS.GET_STATS:
                    return await storageRepo.get('stats');
                case MESSAGE_ACTIONS.GET_MAINTENANCE:
                    const active = blockService.isMaintenanceWindow();
                    return { isActive: active, message: active ? "MAINTENANCE ACTIVE" : "LOCKED" };
                case MESSAGE_ACTIONS.AD_BLOCKED:
                    let count = 0;
                    await storageRepo.updateStats(stats => {
                        stats.adsBlockedCount = (stats.adsBlockedCount || 0) + 1;
                        count = stats.adsBlockedCount;
                    });
                    const isPro = await storageRepo.get('isPro');
                    return { continueBlocking: isPro || count < 200 };
                case MESSAGE_ACTIONS.ACTIVATE_PRO:
                    const success = await blockService.activatePro(request.code);
                    return success ? { success: true, message: 'PRO ACTIVATED!' } : { success: false, error: 'invalid_code' };
                case MESSAGE_ACTIONS.GET_PRO_STATUS:
                    return { isPro: await storageRepo.get('isPro') };
                default:
                    return { error: 'unknown_action' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    routeMessage().then(sendResponse);
    return true;
});
