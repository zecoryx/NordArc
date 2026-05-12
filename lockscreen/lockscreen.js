/**
 * Lockscreen Controller.
 * Manages the breathing exercise and center-focus logic.
 */
class LockscreenController {
    constructor() {
        this.ui = this.cacheElements();
        this.isBreathing = false;
        this.cycles = 0;
        this.TARGET_CYCLES = 3;
    }

    cacheElements() {
        return {
            gem: document.getElementById('breathingGem'),
            text: document.getElementById('breathingText'),
            actionBtn: document.getElementById('actionBtn'),
            closeBtn: document.getElementById('closeBtn'),
            title: document.getElementById('mainTitle'),
            status: document.getElementById('statusCapsule'),
            quote: document.getElementById('quote')
        };
    }

    init() {
        this.setupEventListeners();
        this.loadContext();
    }

    setupEventListeners() {
        this.ui.closeBtn?.addEventListener('click', () => this.handleClose());
        this.ui.actionBtn?.addEventListener('click', () => {
            if (!this.isBreathing) this.startBreathing();
            else window.location.href = 'https://google.com';
        });
    }

    loadContext() {
        const params = new URLSearchParams(window.location.search);
        const blockId = params.get('id');
        if (!blockId) return;

        chrome.storage.session.get(`block_${blockId}`, (result) => {
            const data = result[`block_${blockId}`];
            if (data && data.reason === 'search') {
                this.updateUIForSearch(data.keyword);
                chrome.storage.session.remove(`block_${blockId}`);
            }
        });
    }

    updateUIForSearch(keyword) {
        if (this.ui.title) this.ui.title.textContent = "Search Blocked";
        if (this.ui.status) this.ui.status.textContent = `KEYWORD: ${keyword || 'REDACTED'}`;
        if (this.ui.quote) this.ui.quote.textContent = "Your goals are more important than this search.";
    }

    handleClose() {
        chrome.tabs.getCurrent(tab => {
            if (tab) chrome.tabs.remove(tab.id);
            else window.close();
        });
    }

    startBreathing() {
        this.isBreathing = true;
        if (this.ui.actionBtn) this.ui.actionBtn.style.display = 'none';
        this.breathingLoop();
    }

    breathingLoop() {
        if (this.cycles >= this.TARGET_CYCLES) return this.finishBreathing();

        this.animatePhase('inhale', 'INHALE', 4000, () => {
            this.animatePhase('exhale', 'EXHALE', 6000, () => {
                this.cycles++;
                this.breathingLoop();
            });
        });
    }

    animatePhase(className, text, duration, callback) {
        if (this.ui.gem) this.ui.gem.className = `gem-container ${className}`;
        if (this.ui.text) this.ui.text.textContent = text;
        setTimeout(callback, duration);
    }

    finishBreathing() {
        if (this.ui.gem) this.ui.gem.className = 'gem-container';
        if (this.ui.text) this.ui.text.textContent = 'READY';
        if (this.ui.actionBtn) {
            this.ui.actionBtn.style.display = 'block';
            this.ui.actionBtn.textContent = 'Close Tab';
            this.ui.actionBtn.disabled = false;
            this.ui.actionBtn.onclick = () => this.handleClose();
        }
        if (this.ui.title) this.ui.title.textContent = "Well Done";
    }
}

new LockscreenController().init();
