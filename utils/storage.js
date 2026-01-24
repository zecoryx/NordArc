// ArcZen Storage Utilities

const DEFAULT_DATA = {
  isSetup: false,
  commitmentPassword: null,
  blockedSites: [],
  pendingRemovals: [], // {site, requestTime, unlockTime}
  stats: {
    totalBlocks: 0,
    todayBlocks: 0,
    lastBlockDate: null,
    hourlyBlocks: {}, // {hour: count}
    cleanStreak: 0,
    lastCleanDate: null
  },
  settings: {
    adBlockEnabled: true,
    vpnEnabled: false
  }
};

// Blocked keywords for search filtering
const BLOCKED_KEYWORDS = [
  'porn', 'porno', 'pornhub', 'xvideos', 'xnxx', 'xxx', 'sex', 'sexy',
  'nude', 'naked', 'hentai', 'adult', 'nsfw', 'onlyfans', 'brazzers',
  'xhamster', 'redtube', 'youporn', 'pornstar', 'erotic', 'fetish'
];

// Search engines patterns
const SEARCH_ENGINES = [
  { name: 'Google', pattern: /google\.[a-z.]+\/search/i, queryParam: 'q' },
  { name: 'Bing', pattern: /bing\.com\/search/i, queryParam: 'q' },
  { name: 'Yandex', pattern: /yandex\.[a-z]+\/search/i, queryParam: 'text' },
  { name: 'YouTube', pattern: /youtube\.com\/results/i, queryParam: 'search_query' },
  { name: 'DuckDuckGo', pattern: /duckduckgo\.com/i, queryParam: 'q' }
];

// Default blocked site categories
const DEFAULT_CATEGORIES = {
  social: ['tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'snapchat.com'],
  gaming: ['twitch.tv', 'steam.com', 'epicgames.com', 'roblox.com'],
  video: ['netflix.com', 'hulu.com', 'disneyplus.com'],
  news: ['reddit.com', 'buzzfeed.com', 'tmz.com']
};

// Storage API wrapper
const Storage = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });
  },

  async init() {
    const data = await this.getAll();
    if (!data || Object.keys(data).length === 0) {
      await new Promise((resolve) => {
        chrome.storage.local.set(DEFAULT_DATA, resolve);
      });
      return DEFAULT_DATA;
    }
    return data;
  },

  // Blocked sites management
  async addBlockedSite(site) {
    const blockedSites = await this.get('blockedSites') || [];
    const normalizedSite = site.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    if (!blockedSites.includes(normalizedSite)) {
      blockedSites.push(normalizedSite);
      await this.set('blockedSites', blockedSites);
      return true;
    }
    return false;
  },

  async removeBlockedSite(site, password) {
    const storedPassword = await this.get('commitmentPassword');
    if (password !== storedPassword) {
      return { success: false, error: 'wrong_password' };
    }

    // Check if in maintenance window
    if (this.isMaintenanceWindow()) {
      const blockedSites = await this.get('blockedSites') || [];
      const normalizedSite = site.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      const index = blockedSites.indexOf(normalizedSite);
      
      if (index > -1) {
        blockedSites.splice(index, 1);
        await this.set('blockedSites', blockedSites);
        return { success: true, immediate: true };
      }
      return { success: false, error: 'not_found' };
    }

    // Add to pending removals with 20 min delay
    const pendingRemovals = await this.get('pendingRemovals') || [];
    const now = Date.now();
    const unlockTime = now + (20 * 60 * 1000); // 20 minutes

    pendingRemovals.push({
      site: site.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, ''),
      requestTime: now,
      unlockTime: unlockTime
    });

    await this.set('pendingRemovals', pendingRemovals);
    return { success: true, immediate: false, unlockTime };
  },

  // Check and process pending removals
  async processPendingRemovals() {
    const pendingRemovals = await this.get('pendingRemovals') || [];
    const blockedSites = await this.get('blockedSites') || [];
    const now = Date.now();
    
    const stillPending = [];
    let changed = false;

    for (const removal of pendingRemovals) {
      if (now >= removal.unlockTime) {
        const index = blockedSites.indexOf(removal.site);
        if (index > -1) {
          blockedSites.splice(index, 1);
          changed = true;
        }
      } else {
        stillPending.push(removal);
      }
    }

    if (changed) {
      await this.set('blockedSites', blockedSites);
    }
    await this.set('pendingRemovals', stillPending);

    return { removed: pendingRemovals.length - stillPending.length, pending: stillPending };
  },

  // Maintenance window check (23:50 last day - 00:00 first day)
  isMaintenanceWindow() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Get last day of current month
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Check if it's last day of month and after 23:50
    if (day === lastDay && (hours === 23 && minutes >= 50)) {
      return true;
    }

    // Check if it's first day of month and before 00:00 (midnight)
    // This is technically always false since 00:00 is the start
    // So we just return true for the last day condition

    return false;
  },

  getMaintenanceInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const maintenanceStart = new Date(year, month, lastDay, 23, 50, 0);
    const maintenanceEnd = new Date(year, month + 1, 1, 0, 0, 0);

    return {
      isActive: this.isMaintenanceWindow(),
      nextStart: maintenanceStart,
      nextEnd: maintenanceEnd,
      lastDayOfMonth: lastDay
    };
  },

  // Stats management
  async recordBlock(url) {
    const stats = await this.get('stats') || DEFAULT_DATA.stats;
    const now = new Date();
    const today = now.toDateString();
    const hour = now.getHours();

    // Reset daily count if new day
    if (stats.lastBlockDate !== today) {
      stats.todayBlocks = 0;
      stats.lastBlockDate = today;
    }

    stats.totalBlocks++;
    stats.todayBlocks++;
    stats.hourlyBlocks[hour] = (stats.hourlyBlocks[hour] || 0) + 1;

    // Reset streak if blocked today
    if (stats.lastCleanDate !== today) {
      stats.cleanStreak = 0;
    }

    await this.set('stats', stats);
    return stats;
  },

  async updateCleanStreak() {
    const stats = await this.get('stats') || DEFAULT_DATA.stats;
    const now = new Date();
    const today = now.toDateString();

    if (stats.todayBlocks === 0) {
      if (stats.lastCleanDate !== today) {
        stats.cleanStreak++;
        stats.lastCleanDate = today;
      }
    }

    await this.set('stats', stats);
    return stats.cleanStreak;
  },

  // Password management
  async setPassword(password) {
    await this.set('commitmentPassword', password);
    await this.set('isSetup', true);
  },

  async verifyPassword(password) {
    const stored = await this.get('commitmentPassword');
    return stored === password;
  },

  async isFirstTime() {
    const isSetup = await this.get('isSetup');
    return !isSetup;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Storage, BLOCKED_KEYWORDS, SEARCH_ENGINES, DEFAULT_CATEGORIES };
}
