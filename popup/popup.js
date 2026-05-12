import { MESSAGE_ACTIONS, LIMITS } from '../constants.js';

/**
 * Controller for the Popup UI.
 * Handles user interactions and updates the view.
 */
class PopupController {
    constructor() {
        this.ui = this.cacheElements();
        this.currentSiteToRemove = null;
        this.lastDataHash = null;
    }

    cacheElements() {
        return {
            tabs: document.querySelectorAll('.tab-btn'),
            contents: document.querySelectorAll('.tab-content'),
            streakCount: document.getElementById('streakCount'),
            todayBlocks: document.getElementById('todayBlocks'),
            totalBlocks: document.getElementById('totalBlocks'),
            maintenanceNotice: document.getElementById('maintenanceNotice'),
            addSiteForm: document.getElementById('addSiteForm'),
            siteInput: document.getElementById('siteInput'),
            blockedList: document.getElementById('blockedList'),
            emptyMessage: document.getElementById('emptyMessage'),
            shieldToggle: document.getElementById('shieldToggle'),
            shieldStatusText: document.getElementById('shieldStatusText'),
            adLimitBar: document.getElementById('adLimitBar'),
            adLimitCount: document.getElementById('adLimitCount'),
            nextMaintenance: document.getElementById('nextMaintenance'),
            passwordModal: document.getElementById('passwordModal'),
            passwordInput: document.getElementById('passwordInput'),
            cancelBtn: document.getElementById('cancelBtn'),
            confirmBtn: document.getElementById('confirmBtn'),
            hourlyChart: document.getElementById('hourlyChart'),
            nextMaintEl: document.getElementById('nextMaintenanceDate'),
            statusEl: document.getElementById('maintenanceStatus'),
            proCodeInput: document.getElementById('proCodeInput'),
            activateProBtn: document.getElementById('activateProBtn'),
            proStatus: document.getElementById('proStatus'),
            blockCurrentBtn: document.getElementById('blockCurrentBtn'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.render();
        setInterval(() => this.render(), LIMITS.UI_REFRESH_MS);
    }

    setupEventListeners() {
        // Tab switching
        this.ui.tabs.forEach(tab => {
            tab.onclick = () => {
                const target = tab.dataset.tab;
                this.ui.tabs.forEach(t => t.classList.toggle('active', t === tab));
                this.ui.contents.forEach(c => c.classList.toggle('active', c.id === target));
            };
        });

        // Site management
        this.ui.addSiteForm?.addEventListener('submit', (e) => this.handleAddSite(e));
        this.ui.shieldToggle?.addEventListener('click', () => this.toggleAdBlock());
        this.ui.confirmBtn?.addEventListener('click', () => this.handleRemoveSite());
        this.ui.cancelBtn?.addEventListener('click', () => this.hideModal());

        // Pro features
        this.ui.activateProBtn?.addEventListener('click', () => this.handleActivatePro());
        this.ui.blockCurrentBtn?.addEventListener('click', () => this.handleBlockCurrent());

        // Data tools
        this.ui.exportBtn?.addEventListener('click', () => this.handleExport());
        this.ui.importBtn?.addEventListener('click', () => this.ui.importFile.click());
        this.ui.importFile?.addEventListener('change', (e) => this.handleImport(e));
    }

    async render(force = false) {
        try {
            const [storage, maint] = await Promise.all([
                chrome.storage.local.get(null),
                chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_MAINTENANCE })
            ]);

            const hash = JSON.stringify({ storage, maint });
            if (!force && this.lastDataHash === hash) return;
            this.lastDataHash = hash;

            requestAnimationFrame(() => {
                this.updateStats(storage.stats || {});
                this.updateMaintenance(maint);
                this.updateShield(storage.settings || {}, storage.stats || {}, storage.isPro);
                this.updateProStatus(storage.isPro);
                this.renderList(storage.blockedSites || []);
                this.renderChart(storage.stats?.hourlyBlocks || {});
            });
        } catch (e) {
            console.error('Popup: Render failed', e);
        }
    }

    updateStats(stats) {
        if (this.ui.streakCount && stats.lastBlockDate) {
            const diff = Math.floor(Math.abs(Date.now() - new Date(stats.lastBlockDate).getTime()) / 86400000);
            this.ui.streakCount.textContent = diff;
        }
        if (this.ui.todayBlocks) this.ui.todayBlocks.textContent = stats.todayBlocks || 0;
        if (this.ui.totalBlocks) this.ui.totalBlocks.textContent = stats.totalBlocks || 0;
    }

    updateMaintenance(maint) {
        if (!maint) return;
        if (this.ui.maintenanceNotice) {
            this.ui.maintenanceNotice.style.display = maint.isActive ? 'flex' : 'none';
            this.ui.maintenanceNotice.textContent = `✨ ${maint.message}`;
        }
        if (this.ui.nextMaintenance) this.ui.nextMaintenance.textContent = maint.isActive ? 'ACTIVE NOW' : 'LOCKED';
        if (this.ui.statusEl) {
            this.ui.statusEl.textContent = maint.isActive ? 'UNLOCKED 🔓' : 'LOCKED 🔒';
            this.ui.statusEl.style.color = maint.isActive ? '#10b981' : '#9ca3af';
        }
        if (this.ui.nextMaintEl) {
            const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            this.ui.nextMaintEl.textContent = `${lastDay.toLocaleDateString()} 23:50`;
        }
    }

    updateShield(settings, stats, isPro) {
        const active = settings.adBlockEnabled !== false;
        if (this.ui.shieldToggle) {
            this.ui.shieldToggle.classList.toggle('active', active);
            this.ui.shieldStatusText.textContent = active ? "PROTECTION ON" : "PROTECTION OFF";
            
            const count = stats.adsBlockedCount || 0;
            const pct = isPro ? 100 : Math.min(100, (count / LIMITS.FREE_AD_LIMIT) * 100);
            if (this.ui.adLimitBar) this.ui.adLimitBar.style.width = `${pct}%`;
            if (this.ui.adLimitCount) this.ui.adLimitCount.textContent = isPro ? `${count} (PRO)` : `${count} / ${LIMITS.FREE_AD_LIMIT}`;
        }
    }

    updateProStatus(isPro) {
        if (isPro && this.ui.proCodeInput) {
            this.ui.proCodeInput.value = "Code Activated ✓";
            this.ui.proCodeInput.disabled = true;
            this.ui.proCodeInput.style.color = "#10b981";
            this.ui.activateProBtn.style.display = "none";
            if (this.ui.proStatus) {
                this.ui.proStatus.textContent = "PRO VERSION ACTIVATED";
                this.ui.proStatus.style.color = "#10b981";
            }
        }
    }

    renderList(sites) {
        if (!this.ui.blockedList) return;
        this.ui.blockedList.innerHTML = '';
        this.ui.emptyMessage.style.display = sites.length ? 'none' : 'block';

        const fragment = document.createDocumentFragment();
        sites.forEach(site => {
            const item = document.createElement('div');
            item.className = 'blocked-item';
            
            const span = document.createElement('span');
            span.className = 'name';
            span.textContent = site;
            span.onclick = () => span.classList.toggle('revealed');
            
            const btn = document.createElement('button');
            btn.className = 'remove-btn';
            btn.textContent = '×';
            btn.onclick = (e) => { e.stopPropagation(); this.currentSiteToRemove = site; this.showModal(); };

            item.append(span, btn);
            fragment.appendChild(item);
        });
        this.ui.blockedList.appendChild(fragment);
    }

    renderChart(hourlyData) {
        if (!this.ui.hourlyChart) return;
        this.ui.hourlyChart.innerHTML = '';
        const values = Object.values(hourlyData);
        const max = values.length ? Math.max(...values, 5) : 5;
        const currentHour = new Date().getHours();
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < 24; i++) {
            const bar = document.createElement('div');
            bar.className = 'chart-bar' + (i === currentHour ? ' current' : '');
            bar.style.height = `${Math.max(4, ((hourlyData[i] || 0) / max) * 100)}%`;
            fragment.appendChild(bar);
        }
        this.ui.hourlyChart.appendChild(fragment);
    }

    // Handlers
    async handleAddSite(e) {
        e.preventDefault();
        const site = this.ui.siteInput.value.trim();
        if (!site) return;
        const res = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.ADD_SITE, site });
        if (res.success) { this.ui.siteInput.value = ''; this.render(true); }
        else alert(res.error === 'limit_reached' ? "FREE LIMIT" : "Error");
    }

    async toggleAdBlock() {
        const { settings = {} } = await chrome.storage.local.get('settings');
        settings.adBlockEnabled = !settings.adBlockEnabled;
        await chrome.storage.local.set({ settings });
        this.render(true);
    }

    async handleRemoveSite() {
        const res = await chrome.runtime.sendMessage({ 
            action: MESSAGE_ACTIONS.REMOVE_SITE, 
            site: this.currentSiteToRemove, 
            password: this.ui.passwordInput.value 
        });
        if (res.success) { this.hideModal(); this.render(true); }
        else { this.ui.passwordInput.classList.add('shake'); setTimeout(() => this.ui.passwordInput.classList.remove('shake'), 500); }
    }

    async handleActivatePro() {
        const res = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.ACTIVATE_PRO, code: this.ui.proCodeInput.value });
        if (res.success) this.render(true);
        else alert("Invalid code");
    }

    async handleBlockCurrent() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
            const res = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.ADD_SITE, site: tab.url });
            if (res.success) this.render(true);
        }
    }

    handleExport() {
        chrome.storage.local.get(null, data => {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nordarc-backup.json';
            a.click();
        });
    }

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.blockedSites && data.stats) {
                    await chrome.storage.local.set(data);
                    this.render(true);
                }
            } catch (err) { alert("Invalid file"); }
        };
        reader.readAsText(file);
    }

    showModal() { this.ui.passwordModal.classList.add('active'); this.ui.passwordInput.focus(); }
    hideModal() { this.ui.passwordModal.classList.remove('active'); this.ui.passwordInput.value = ''; }
}

new PopupController().init();
