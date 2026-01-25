// ARCZEN POPUP CONTROLLER

document.addEventListener('DOMContentLoaded', async () => {
    // --- ELEMENTS ---
    const ui = {
        tabs: document.querySelectorAll('.tab-btn'),
        contents: document.querySelectorAll('.tab-content'),

        // Home
        streakCount: document.getElementById('streakCount'),
        todayBlocks: document.getElementById('todayBlocks'),
        totalBlocks: document.getElementById('totalBlocks'),
        maintenanceNotice: document.getElementById('maintenanceNotice'),

        // Rules
        addSiteForm: document.getElementById('addSiteForm'),
        siteInput: document.getElementById('siteInput'),
        blockedList: document.getElementById('blockedList'),
        emptyMessage: document.getElementById('emptyMessage'),


        // Shield (AdBlock)
        shieldToggle: document.getElementById('shieldToggle'),
        shieldStatusText: document.getElementById('shieldStatusText'),
        adLimitBar: document.getElementById('adLimitBar'),
        adLimitCount: document.getElementById('adLimitCount'),

        // VPN
        vpnConnectBtn: document.getElementById('vpnConnectBtn'),
        vpnStatus: document.getElementById('vpnStatus'),
        countrySelector: document.getElementById('countrySelector'),

        // Settings / Misc
        nextMaintenance: document.getElementById('nextMaintenance'),
        passwordModal: document.getElementById('passwordModal'),
        passwordInput: document.getElementById('passwordInput'),
        cancelBtn: document.getElementById('cancelBtn'),
        confirmBtn: document.getElementById('confirmBtn'),
        hourlyChart: document.getElementById('hourlyChart')
    };

    let currentSiteToRemove = null;

    // --- TAB LOGIC ---
    ui.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            ui.tabs.forEach(t => t.classList.remove('active'));
            ui.contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- DATA LOADING ---
    async function render() {
        const { blockedSites = [], stats = {}, settings = {}, vpnEnabled = false } =
            await chrome.storage.local.get(['blockedSites', 'stats', 'settings', 'vpnEnabled']);


        // Stats
        // Stats (Dynamic Streak Calculation)
        if (ui.streakCount) {
            if (stats.lastBlockDate) {
                const lastBlockTime = new Date(stats.lastBlockDate).getTime();
                const diffTime = Math.abs(Date.now() - lastBlockTime);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                ui.streakCount.textContent = diffDays;
            } else {
                ui.streakCount.textContent = "0";
            }
        }
        if (ui.todayBlocks) ui.todayBlocks.textContent = stats.todayBlocks || 0;
        if (ui.totalBlocks) ui.totalBlocks.textContent = stats.totalBlocks || 0;

        // Maintenance
        const maintenanceInfo = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'getMaintenanceInfo' }, resolve);
        });

        if (ui.maintenanceNotice) {
            if (maintenanceInfo.isActive) {
                ui.maintenanceNotice.style.display = 'flex';
                ui.maintenanceNotice.innerHTML = `<span>✨</span> ${maintenanceInfo.message}`;
            } else {
                ui.maintenanceNotice.style.display = 'none';
            }
        }

        if (ui.nextMaintenance) {
            ui.nextMaintenance.textContent = maintenanceInfo.isActive ?
                'ACTIVE NOW (INSTANT)' :
                'LOCKED (20 MIN DELAY)';
        }

        // START NEW MAINTENANCE UI LOGIC
        const nextMaintEl = document.getElementById('nextMaintenanceDate');
        const statusEl = document.getElementById('maintenanceStatus');

        if (nextMaintEl) {
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            nextMaintEl.textContent = `${lastDay.toLocaleDateString()} 23:50`;
        }

        if (statusEl) {
            statusEl.textContent = maintenanceInfo.isActive ? 'UNLOCKED 🔓' : 'LOCKED 🔒';
            statusEl.style.color = maintenanceInfo.isActive ? '#10b981' : '#9ca3af';
        }
        // END NEW LOGIC

        // Blocked List
        renderList(blockedSites);



        // Shield / AdBlock Logic
        const isAdBlockOn = settings.adBlockEnabled !== false;
        const { isPro = false } = await chrome.storage.local.get('isPro');

        if (ui.shieldToggle) {
            ui.shieldToggle.classList.toggle('active', isAdBlockOn);
            ui.shieldStatusText.textContent = isAdBlockOn ? "PROTECTION ON" : "PROTECTION OFF";
            ui.shieldStatusText.classList.toggle('active', isAdBlockOn);

            // Limit Tracker (Pro = unlimited)
            const adCount = stats.adsBlockedCount || 0;

            if (isPro) {
                // Pro users - show unlimited
                if (ui.adLimitBar) ui.adLimitBar.style.width = '100%';
                if (ui.adLimitCount) ui.adLimitCount.textContent = `${adCount} (PRO - UNLIMITED)`;
                ui.adLimitBar?.style.setProperty('background', '#10b981');
            } else {
                // Free users - show limit
                const limit = 200;
                const pct = Math.min(100, (adCount / limit) * 100);

                if (ui.adLimitBar) ui.adLimitBar.style.width = `${pct}%`;
                if (ui.adLimitCount) ui.adLimitCount.textContent = `${adCount} / ${limit}`;

                if (adCount >= limit) {
                    ui.shieldToggle.classList.remove('active');
                    ui.shieldStatusText.textContent = "LIMIT REACHED (UPGRADE)";
                    ui.shieldStatusText.style.color = "#ef4444";
                }
            }
        }

        // VPN Status (Visual Only - Coming Soon)
        if (ui.vpnConnectBtn) {
            const isVpnOn = !!vpnEnabled;
            ui.vpnConnectBtn.classList.toggle('active', isVpnOn);
            ui.vpnStatus.textContent = isVpnOn ? "CONNECTED" : "DISCONNECTED";
            ui.vpnStatus.classList.toggle('active', isVpnOn);
            const vpnText = ui.vpnConnectBtn.querySelector('.vpn-text');
            if (vpnText) vpnText.textContent = isVpnOn ? "STOP" : "CONNECT";

            // Always show Coming Soon for VPN
            const vpnMessage = document.getElementById('vpnMessage');
            if (vpnMessage) {
                vpnMessage.textContent = "Coming Soon...";
                vpnMessage.style.color = "#9ca3af";
            }
        }

        // Chart
        renderChart(stats.hourlyBlocks || {});
    }

    function renderList(sites) {
        if (!ui.blockedList) return;
        ui.blockedList.innerHTML = '';
        if (sites.length === 0) {
            ui.emptyMessage.style.display = 'block';
        } else {
            ui.emptyMessage.style.display = 'none';
            sites.forEach(site => {
                const li = document.createElement('div');
                li.className = 'blocked-item';
                li.innerHTML = `
          <span class="name">${site}</span>
          <button class="remove-btn" data-site="${site}" title="Remove">×</button>
        `;
                ui.blockedList.appendChild(li);
            });

            // Attach handlers for reveal on click
            document.querySelectorAll('.blocked-item .name').forEach(nameEl => {
                nameEl.addEventListener('click', () => {
                    nameEl.classList.toggle('revealed');
                });
            });

            // Attach handlers for remove
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentSiteToRemove = btn.dataset.site;
                    showModal();
                });
            });
        }
    }



    function renderChart(hourlyData) {
        if (!ui.hourlyChart) return;
        ui.hourlyChart.innerHTML = '';
        const values = Object.values(hourlyData);
        const max = values.length ? Math.max(...values, 5) : 5;
        const currentHour = new Date().getHours();

        for (let i = 0; i < 24; i++) {
            const count = hourlyData[i] || 0;
            const heightPercentage = (count / max) * 100;

            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            if (i === currentHour) bar.classList.add('current');
            bar.style.height = `${Math.max(4, heightPercentage)}%`;
            bar.title = `${i}:00 - ${count} blocks`;

            ui.hourlyChart.appendChild(bar);
        }
    }

    // --- ACTIONS ---

    // Add Site (with 7-site free limit)
    if (ui.addSiteForm) {
        ui.addSiteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const site = ui.siteInput.value.trim();
            if (!site) return;

            const response = await chrome.runtime.sendMessage({ action: 'addSite', site });

            if (response && response.success) {
                ui.siteInput.value = '';
                render();
            } else if (response && response.error === 'limit_reached') {
                alert("FREE LIMIT: Maximum 7 sites. Enter Pro code in Settings to unlock.");
            } else if (response && response.error === 'already_exists') {
                alert("This site is already blocked.");
            }
        });
    }

    // Shield Toggle (AdBlock)
    if (ui.shieldToggle) {
        ui.shieldToggle.addEventListener('click', async () => {
            const { stats = {} } = await chrome.storage.local.get('stats');

            // Check count
            if ((stats.adsBlockedCount || 0) >= 200) {
                alert("Free Plan Limit Reached (200 Ads).");
                // Optional: Redirect to upgrade
                return;
            }

            const { settings = {} } = await chrome.storage.local.get('settings');
            settings.adBlockEnabled = !settings.adBlockEnabled;
            await chrome.storage.local.set({ settings });
            render();
        });
    }

    // REAL VPN Connect (with trial check)
    if (ui.vpnConnectBtn) {
        ui.vpnConnectBtn.addEventListener('click', async () => {
            const response = await chrome.runtime.sendMessage({ action: 'toggleVPN' });
            if (response && response.success) {
                render();
            } else if (response && response.error === 'trial_expired') {
                alert(response.message || "Free trial expired. Enter Pro code in Settings.");
            }
        });
    }

    // Country Selector (Visual only)
    if (ui.countrySelector) {
        ui.countrySelector.addEventListener('click', () => {
            alert("Proxy configuration is set in background.js");
        });
    }

    // Modal Logic
    function showModal() {
        ui.passwordModal.classList.add('active');
        ui.passwordInput.focus();
        ui.passwordInput.value = '';
    }
    function hideModal() {
        ui.passwordModal.classList.remove('active');
        ui.passwordInput.value = '';
    }

    if (ui.cancelBtn) ui.cancelBtn.addEventListener('click', hideModal);

    if (ui.confirmBtn) {
        ui.confirmBtn.addEventListener('click', async () => {
            const pwd = ui.passwordInput.value;
            const response = await chrome.runtime.sendMessage({
                action: 'removeSite',
                site: currentSiteToRemove,
                password: pwd
            });

            if (response.success) {
                hideModal();
                if (response.immediate) {
                    // Success (Reload/Repaint)
                }
                render();
            } else {
                if (response.error === 'locked_until_maintenance') {
                    // Strict Lock Alert
                    alert(response.message || "LOCKED: Removal only allowed at end of month.");
                    hideModal();
                } else {
                    // Password Error
                    ui.passwordInput.style.borderColor = '#ef4444';
                    ui.passwordInput.classList.add('shake');
                    setTimeout(() => {
                        ui.passwordInput.style.borderColor = '#333';
                        ui.passwordInput.classList.remove('shake');
                    }, 500);
                }
            }
        });
    }

    // Enter to confirm in modal
    if (ui.passwordInput) {
        ui.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') ui.confirmBtn.click();
        });
    }

    // --- PRO CODE ACTIVATION ---
    const proCodeInput = document.getElementById('proCodeInput');
    const activateProBtn = document.getElementById('activateProBtn');
    const proStatus = document.getElementById('proStatus');

    // Check if already Pro and update UI
    (async () => {
        const { isPro = false } = await chrome.storage.local.get('isPro');
        if (isPro && proCodeInput && activateProBtn) {
            proCodeInput.value = "Code ishlatgansiz ✓";
            proCodeInput.disabled = true;
            proCodeInput.style.color = "#10b981";
            proCodeInput.style.textAlign = "center";
            activateProBtn.style.display = "none";
            if (proStatus) {
                proStatus.textContent = "PRO VERSION ACTIVATED";
                proStatus.style.color = "#10b981";
            }
        }
    })();

    if (activateProBtn) {
        activateProBtn.addEventListener('click', async () => {
            const code = proCodeInput ? proCodeInput.value : '';
            const response = await chrome.runtime.sendMessage({ action: 'activateProCode', code });

            if (proStatus) {
                if (response && response.success) {
                    proStatus.textContent = response.message;
                    proStatus.style.color = '#10b981';
                    // Update input to show activated state
                    if (proCodeInput) {
                        proCodeInput.value = "Code ishlatgansiz ✓";
                        proCodeInput.disabled = true;
                        proCodeInput.style.color = "#10b981";
                        proCodeInput.style.textAlign = "center";
                    }
                    activateProBtn.style.display = "none";
                    render();
                } else {
                    proStatus.textContent = response.message || 'Invalid code.';
                    proStatus.style.color = '#ef4444';
                }
            }
        });
    }

    // Init
    render();
    setInterval(render, 30000); // Check status every 30s

    // --- NEW FEATURES ---

    // 1. Block Current Tab
    const blockCurrentBtn = document.getElementById('blockCurrentBtn');
    if (blockCurrentBtn) {
        blockCurrentBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (tabs[0] && tabs[0].url) {
                    const url = tabs[0].url;
                    // Send addSite message
                    const response = await chrome.runtime.sendMessage({ action: 'addSite', site: url });
                    if (response && response.success) {
                        ui.siteInput.value = '';
                        render();
                    } else if (response && response.error === 'limit_reached') {
                        alert("FREE LIMIT REACHED.");
                    } else if (response && response.error === 'already_exists') {
                        alert("Already blocked.");
                    }
                }
            });
        });
    }

    // 2. Export Data
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const data = await chrome.storage.local.get(null);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `arczen-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        });
    }

    // 3. Import Data
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    await chrome.storage.local.set(data);
                    alert("Data restored successfully!");
                    render();
                } catch (err) {
                    alert("Error importing data: " + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

});
