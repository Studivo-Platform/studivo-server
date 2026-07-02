const rateLimit = require('express-rate-limit');
const { env }   = require('../config/env');

// General API rate limiter — applied globally in app.js
const globalLimiter = rateLimit({
    windowMs:        env.RATE_LIMIT_WINDOW_MS, // 15 minutes
    max:             env.RATE_LIMIT_MAX,       // 100 requests per window
    standardHeaders: true,                     // Returns rate limit info in headers
    legacyHeaders:   false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});

// Strict limiter for AI-powered endpoints (OpenAI costs money)
const aiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max:      env.AI_RATE_LIMIT_MAX,    // 10 requests per window
    message: {
        success: false,
        message: 'AI request limit reached. Please wait before making another request.',
    },
});

// Extra strict for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max:      10,              // 10 login attempts per window
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
});

module.exports = {
    globalLimiter,
    aiLimiter,
    authLimiter,
};