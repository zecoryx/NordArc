// NordArc Constants & Configuration

export const LIMITS = {
    FREE_SITE_LIMIT: 7,
    FREE_AD_LIMIT: 200,
    BATCH_REPORT_MS: 5000,
    UI_REFRESH_MS: 5000
};

export const STORAGE_KEYS = {
    BLOCKED_SITES: 'blockedSites',
    IS_PRO: 'isPro',
    STATS: 'stats',
    SETTINGS: 'settings',
    IS_SETUP: 'isSetup',
    PWD_HASH: 'commitmentPasswordHash'
};

export const MESSAGE_ACTIONS = {
    ADD_SITE: 'addSite',
    REMOVE_SITE: 'removeSite',
    GET_STATS: 'getStats',
    GET_MAINTENANCE: 'getMaintenanceInfo',
    AD_BLOCKED: 'adBlocked',
    ACTIVATE_PRO: 'activateProCode',
    GET_PRO_STATUS: 'getProStatus'
};

export const PRO_CODES_HASHED = [
    '50719875e533816766467389146522c7ed3684a0d8438c353a2944f227189178', // NORDARC-PRO-2026
    '335552467d30776b2c2957f897f26c98604924151329a285d85e78393524f2b1', // NORDARC-BETA-VIP
    'd830b501d512a8039c9f9571060965e69e4a362e5b8e9766627c525f9b4c0977'  // ZECORYX-UNLOCK
];

export const BLOCKED_KEYWORDS = [
    'porn', 'porno', 'pornhub', 'xvideos', 'xnxx', 'xxx', 'sex', 'sexy',
    'nude', 'naked', 'hentai', 'adult', 'nsfw', 'onlyfans', 'brazzers',
    'xhamster', 'redtube', 'youporn', 'pornstar', 'erotic', 'fetish'
];

export const SEARCH_ENGINES = [
    { name: 'Google', pattern: /google\.[a-z.]+\/search/i, queryParam: 'q' },
    { name: 'Bing', pattern: /bing\.com\/search/i, queryParam: 'q' },
    { name: 'Yandex', pattern: /yandex\.[a-z]+\/search/i, queryParam: 'text' },
    { name: 'YouTube', pattern: /youtube\.com\/results/i, queryParam: 'search_query' },
    { name: 'DuckDuckGo', pattern: /duckduckgo\.com/i, queryParam: 'q' },
    { name: 'Baidu', pattern: /baidu\.com\/s/i, queryParam: 'wd' },
    { name: 'Ask', pattern: /ask\.com\/web/i, queryParam: 'q' },
    { name: 'AOL', pattern: /search\.aol\.com\/aol\/search/i, queryParam: 'q' }
];
