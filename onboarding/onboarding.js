/**
 * Onboarding Controller.
 * Handles initial setup and password hashing.
 */
class OnboardingController {
    constructor() {
        this.commonSites = [
            'instagram.com', 'tiktok.com', 'twitter.com', 'x.com',
            'facebook.com', 'youtube.com', 'reddit.com', 'linkedin.com',
            'netflix.com', 'pinterest.com'
        ];
        this.selectedSites = new Set();
        this.elements = this.cacheElements();
    }

    cacheElements() {
        return {
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            passInput: document.getElementById('passInput'),
            passConfirm: document.getElementById('passConfirm'),
            nextBtn: document.getElementById('nextBtn'),
            errorMsg: document.getElementById('errorMsg'),
            sitesGrid: document.getElementById('sitesGrid'),
            finishBtn: document.getElementById('finishBtn')
        };
    }

    init() {
        this.populateGrid();
        this.setupEventListeners();
    }

    populateGrid() {
        if (!this.elements.sitesGrid) return;
        this.commonSites.forEach(site => {
            const div = document.createElement('div');
            div.className = 'site-option';
            div.textContent = site;
            div.onclick = () => this.toggleSite(div, site);
            this.elements.sitesGrid.appendChild(div);
        });
    }

    toggleSite(el, site) {
        if (this.selectedSites.has(site)) {
            this.selectedSites.delete(site);
            el.classList.remove('selected');
        } else {
            this.selectedSites.add(site);
            el.classList.add('selected');
        }
    }

    setupEventListeners() {
        this.elements.nextBtn?.addEventListener('click', () => this.handleStep1());
        this.elements.finishBtn?.addEventListener('click', () => this.handleStep2());
    }

    async handleStep1() {
        const p1 = this.elements.passInput.value;
        const p2 = this.elements.passConfirm.value;

        if (this.elements.errorMsg) this.elements.errorMsg.style.display = 'none';

        if (p1.length < 4) return this.showError("Passcode must be at least 4 characters");
        if (p1 !== p2) return this.showError("Passcodes do not match");

        const hash = await this.hashString(p1);
        await chrome.storage.local.set({ commitmentPasswordHash: hash });

        this.transitionToStep2();
    }

    async handleStep2() {
        const sites = Array.from(this.selectedSites);
        await chrome.storage.local.set({
            blockedSites: sites,
            isSetup: true
        });

        alert("Setup Complete. Stay Focused.");
        chrome.tabs.getCurrent(tab => {
            if (tab) chrome.tabs.remove(tab.id);
            else window.close();
        });
    }

    transitionToStep2() {
        if (this.elements.step1) this.elements.step1.classList.remove('active');
        setTimeout(() => {
            if (this.elements.step1) this.elements.step1.style.display = 'none';
            if (this.elements.step2) {
                this.elements.step2.style.display = 'block';
                setTimeout(() => this.elements.step2.classList.add('active'), 50);
            }
        }, 300);
    }

    showError(msg) {
        if (this.elements.errorMsg) {
            this.elements.errorMsg.textContent = msg;
            this.elements.errorMsg.style.display = 'block';
        }
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

new OnboardingController().init();
