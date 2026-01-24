// ARCZEN VPN CONFIGURATION
// Replace the values below with your actual Proxy/VPS details.

export const VPN_CONFIG = {
    // Type: 'socks5', 'http', or 'https'
    // SOCKS5 is recommended for VPN-like behavior.
    type: 'socks5',

    // Your VPS IP Address
    host: '1.2.3.4',

    // Your Proxy Port (e.g. 1080 for Socks, 8080 for HTTP)
    port: 1080,

    // Optional Authentication (Leave empty if IP whitelisted)
    username: '',
    password: ''
};
