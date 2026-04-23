const rateLimit = require('express-rate-limit')

// Strict limiter for credential endpoints — slows brute-force without
// locking out normal users. Keyed by IP (trust proxy is on in server.js).
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in a few minutes.' }
})

// Looser limiter for account creation — still cheap to abuse without one.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1h
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many accounts created from this IP. Try again later.' }
})

module.exports = { authLimiter, registerLimiter }
