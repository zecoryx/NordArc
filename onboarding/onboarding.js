// ArcZen Onboarding Logic (Opal Style)

const commonSites = [
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'youtube.com',
    'reddit.com',
    'linkedin.com',
    'netflix.com',
    'pinterest.com'
];

const elements = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    passInput: document.getElementById('passInput'),
    passConfirm: document.getElementById('passConfirm'),
    nextBtn: document.getElementById('nextBtn'),
    errorMsg: document.getElementById('errorMsg'),
    sitesGrid: document.getElementById('sitesGrid'),
    finishBtn: document.getElementById('finishBtn')
};

const selectedSites = new Set();

// Populate Grid
commonSites.forEach(site => {
    const div = document.createElement('div');
    div.className = 'site-option';
    div.textContent = site;
    div.onclick = () => toggleSite(div, site);
    elements.sitesGrid.appendChild(div);
});

function toggleSite(el, site) {
    if (selectedSites.has(site)) {
        selectedSites.delete(site);
        el.classList.remove('selected');
    } else {
        selectedSites.add(site);
        el.classList.add('selected');
    }
}

// Step 1: Password
elements.nextBtn.addEventListener('click', async () => {
    const p1 = elements.passInput.value;
    const p2 = elements.passConfirm.value;

    elements.errorMsg.style.display = 'none';

    if (p1.length < 4) {
        showError("Passcode must be at least 4 characters");
        return;
    }

    if (p1 !== p2) {
        showError("Passcodes do not match");
        return;
    }

    // Save Password
    await chrome.storage.local.set({ commitmentPassword: p1 });

    // Switch Step
    elements.step1.classList.remove('active');
    setTimeout(() => {
        elements.step1.style.display = 'none';
        elements.step2.style.display = 'block';
        setTimeout(() => elements.step2.classList.add('active'), 50);
    }, 300);
});

// Step 2: Finish
elements.finishBtn.addEventListener('click', async () => {
    const sites = Array.from(selectedSites);
    await chrome.storage.local.set({
        blockedSites: sites,
        isSetup: true
    });

    // Close tab/Start
    alert("Setup Complete. Stay Focused.");
    chrome.tabs.getCurrent(tab => {
        if (tab) chrome.tabs.remove(tab.id);
    });
});

function showError(msg) {
    elements.errorMsg.textContent = msg;
    elements.errorMsg.style.display = 'block';
}
