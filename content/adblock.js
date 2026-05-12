// NordArc AdBlocker - Performance Optimized

let adBlockEnabled = true;
let continueBlocking = true;
const BATCH_REPORT_TIME = 5000; // Increased to 5s to reduce overhead

const AD_SELECTORS = [
    'iframe[src*="googleads"]', 'iframe[src*="doubleclick"]', 'iframe[src*="adservice"]',
    'div[id*="div-gpt-ad"]', 'div[class*="ad-unit"]', 'aside[class*="ad"]',
    '.adsbygoogle', '#top-ad', '.banner-ad', '.sidebar-ad', '.footer-ad',
    '[id^="ad-"]', '[class^="ad-"]', 'a[href*="/ad/"]'
].join(','); // Combined selector for faster engine matching

// Cached settings check
chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || { adBlockEnabled: true };
    if (settings.adBlockEnabled) initAdBlocker();
});

function initAdBlocker() {
    removeAds();

    const observer = new MutationObserver((mutations) => {
        if (!continueBlocking) return;
        
        let foundNewAds = false;
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (node.nodeType === 1) { // Process element nodes only
                    if (checkAndRemove(node)) foundNewAds = true;
                }
            }
        }
        
        if (foundNewAds) throttleReport();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function checkAndRemove(element) {
    let found = false;
    // Check element itself
    if (element.matches(AD_SELECTORS)) {
        element.style.display = 'none';
        found = true;
    }
    // Check subtree efficiently
    const innerAds = element.querySelectorAll(AD_SELECTORS);
    if (innerAds.length > 0) {
        for (let i = 0; i < innerAds.length; i++) {
            innerAds[i].style.display = 'none';
        }
        found = true;
    }
    return found;
}

function removeAds() {
    const elements = document.querySelectorAll(AD_SELECTORS);
    if (elements.length > 0) {
        let hidden = false;
        elements.forEach(el => {
            if (el.style.display !== 'none') {
                el.style.display = 'none';
                hidden = true;
            }
        });
        if (hidden) throttleReport();
    }
}

let reportTimer = null;
function throttleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'adBlocked' }, (response) => {
            if (response && response.continueBlocking === false) {
                continueBlocking = false;
            }
        });
        reportTimer = null;
    }, BATCH_REPORT_TIME);
}

// Low-priority background cleanup
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => removeAds(), { timeout: 2000 });
}
