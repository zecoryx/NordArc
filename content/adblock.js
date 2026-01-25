// ArcZen Basic AdBlocker
// Only active if enabled and limit not reached

const AD_SELECTORS = [
    'iframe[src*="ads"]',
    'div[id*="ad-"]',
    'div[class*="ad-"]',
    'div[class*="sponsored"]',
    'aside',
    '.adsbygoogle'
];

async function runAdBlocker() {
    const { settings = {} } = await chrome.storage.local.get('settings');
    if (settings.adBlockEnabled === false) return;

    // Check limit initially via message (optional, but good for performance)
    // We'll just try to block and ask background if we should stop.

    AD_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Send message to count
            chrome.runtime.sendMessage({ action: 'adBlocked' }, (response) => {
                if (response && response.continueBlocking) {
                    el.style.display = 'none';
                    // el.style.border = '2px solid red'; // Debug removed
                    // console.log('ArcZen: Ad blocked'); // Log removed

                }
            });
        });
    });
}

// Run on load and scroll
runAdBlocker();
setInterval(runAdBlocker, 5000); // Optimized to 5s

