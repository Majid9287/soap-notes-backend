export const rateLimitConfig = {
    dailyLimit: 5,
    headers: {
        apiKey: 'X-API-Key',
        remaining: 'X-RateLimit-Remaining',
        reset: 'X-RateLimit-Reset'
    },
    urlPattern: /^\/api\/soapnotes\/([^\/]+)/, // Pattern to match API key in URL
};