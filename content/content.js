// ArcZen Content Script (AdBlock logic)

// Check if ad blocking is enabled
chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || { adBlockEnabled: true };

    if (settings.adBlockEnabled) {
        initAdBlocker();
    }
});

function initAdBlocker() {
    // Observer to remove ad elements as they load
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                removeAds();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial cleanup
    removeAds();
    console.log('ArcZen AdBlock Active');
}

function removeAds() {
    const adSelectors = [
        'iframe[src*="googleads"]',
        'iframe[src*="doubleclick"]',
        'div[id*="div-gpt-ad"]',
        '.adsbygoogle',
        '#top-ad',
        '.banner-ad'
    ];

    adSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.remove(); // Safely remove element functionality from DOM
            // Or just hide: el.style.display = 'none';
            el.style.display = 'none';
        });
    });
}
