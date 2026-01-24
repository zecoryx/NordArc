// ArcZen Lock Screen Logic (Opal Style)

const ui = {
    gem: document.getElementById('breathingGem'),
    text: document.getElementById('breathingText'),
    actionBtn: document.getElementById('actionBtn'),
    closeBtn: document.getElementById('closeBtn'),
    title: document.getElementById('mainTitle'),
    status: document.getElementById('statusCapsule'),
    quote: document.getElementById('quote')
};

let isBreathing = false;
let phase = 'inhale'; // inhale, hold, exhale
let cycles = 0;
const TARGET_CYCLES = 3;

// Parse URL params
const params = new URLSearchParams(window.location.search);
const reason = params.get('reason');
const keyword = params.get('keyword');

if (reason === 'search') {
    ui.title.textContent = "Search Blocked";
    ui.status.textContent = `KEYWORD: ${keyword}`;
    ui.quote.textContent = "Your goals are more important than this search.";
} else {
    ui.title.textContent = "Focus Guard";
}

// Logic
ui.closeBtn.addEventListener('click', () => {
    window.close(); // Only works if script opened it, but good to have
    chrome.tabs.getCurrent(tab => {
        if (tab) chrome.tabs.remove(tab.id);
    });
});

ui.actionBtn.addEventListener('click', () => {
    if (!isBreathing) {
        startBreathing();
    } else {
        // Unlock logic if breathing done?
        // Actually, just redirect home or close
        window.location.href = 'https://google.com';
    }
});

function startBreathing() {
    isBreathing = true;
    ui.actionBtn.style.display = 'none'; // Hide button during exercise
    ui.text.textContent = 'INHALE';
    ui.gem.classList.add('inhale');

    breathingLoop();
}

function breathingLoop() {
    if (cycles >= TARGET_CYCLES) {
        finishBreathing();
        return;
    }

    // Inhale (4s)
    ui.gem.className = 'gem-container inhale';
    ui.text.textContent = 'INHALE';

    setTimeout(() => {
        // Exhale (6s)
        ui.gem.className = 'gem-container exhale';
        ui.text.textContent = 'EXHALE';

        setTimeout(() => {
            cycles++;
            breathingLoop();
        }, 6000); // Exhale duration

    }, 4000); // Inhale duration
}

function finishBreathing() {
    ui.gem.className = 'gem-container';
    ui.text.textContent = 'READY';
    ui.actionBtn.style.display = 'block';
    ui.actionBtn.textContent = 'Continue to Site (Delayed)';
    ui.actionBtn.disabled = true; // Still blocked technically

    ui.title.textContent = "Well Done";
    ui.quote.textContent = "You've centered yourself. Return to your task.";

    setTimeout(() => {
        ui.actionBtn.textContent = "Close Tab";
        ui.actionBtn.disabled = false;
        ui.actionBtn.onclick = () => window.close();
    }, 1000);
}
