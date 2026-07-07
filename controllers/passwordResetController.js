const crypto = require('crypto')
const bcrypt = require('bcrypt')
const customerModel = require('../models/customerModel')
const sellerModel = require('../models/sellerModel')
const adminModel = require('../models/adminModel')
const { responseReturn } = require('../utiles/response')
const { sendPasswordResetEmail } = require('../utiles/emailService')

// Reset tokens are issued raw to the user (in the email URL) and stored as a
// SHA-256 hash on the user doc. A DB leak therefore can't be replayed into
// live reset links. 1h expiry; consumed on use.
const TOKEN_BYTES = 32
const TOKEN_TTL_MS = 60 * 60 * 1000

const modelForRole = (role) => {
    if (role === 'customer') return customerModel
    if (role === 'seller') return sellerModel
    if (role === 'admin') return adminModel
    return null
}

const resetPathForRole = (role) => {
    // Customers reset on the storefront; sellers/admins on the dashboard.
    // In production, fall back to the real public domains — never localhost,
    // which would produce a dead link AND is a strong spam signal that can get
    // the whole email filtered/dropped by Gmail.
    const isProd = process.env.NODE_ENV === 'production' || process.env.MODE === 'pro'
    if (role === 'customer') {
        const base = process.env.FRONTEND_URL || (isProd ? 'https://nimbo.co.zw' : 'http://localhost:3000')
        return `${base.replace(/\/$/, '')}/reset-password`
    }
    const base = process.env.DASHBOARD_URL || (isProd ? 'https://nimbo-dashboard.vercel.app' : 'http://localhost:3001')
    return `${base.replace(/\/$/, '')}/reset-password`
}

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex')

class passwordResetController {
    forgot_password = async (req, res) => {
        const { email, role } = req.body
        const Model = modelForRole(role)
        if (!Model) {
            return responseReturn(res, 400, { error: 'Invalid role' })
        }

        // Generic response prevents email enumeration: callers can't tell
        // whether the address exists.
        const genericOk = () =>
            responseReturn(res, 200, {
                message: 'If an account exists for that email, a reset link has been sent.'
            })

        try {
            const user = await Model.findOne({ email })
            if (!user) return genericOk()

            const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex')
            user.passwordResetTokenHash = hashToken(rawToken)
            user.passwordResetExpires = new Date(Date.now() + TOKEN_TTL_MS)
            await user.save()

            const params = new URLSearchParams({ token: rawToken, role })
            const resetUrl = `${resetPathForRole(role)}?${params.toString()}`

            // Await the send: on Render's free tier the instance can be frozen
            // right after the response, killing an un-awaited background send.
            // The transporter has short timeouts so this can't hang the request.
            try {
                await sendPasswordResetEmail(user.email, resetUrl, user.name || '')
            } catch (err) {
                console.error('reset email send failed:', err.message)
            }

            return genericOk()
        } catch (error) {
            console.error('forgot_password error:', error.message)
            // Still return generic 200 to avoid leaking errors that could be
            // probed for enumeration. The error is logged server-side.
            return responseReturn(res, 200, {
                message: 'If an account exists for that email, a reset link has been sent.'
            })
        }
    }

    reset_password = async (req, res) => {
        const { token, role, new_password } = req.body
        const Model = modelForRole(role)
        if (!Model) {
            return responseReturn(res, 400, { error: 'Invalid role' })
        }

        try {
            const tokenHash = hashToken(token)
            const user = await Model.findOne({
                passwordResetTokenHash: tokenHash,
                passwordResetExpires: { $gt: new Date() }
            }).select('+password +passwordResetTokenHash +passwordResetExpires')

            if (!user) {
                return responseReturn(res, 400, {
                    error: 'Reset link is invalid or has expired. Request a new one.'
                })
            }

            user.password = await bcrypt.hash(new_password, 10)
            user.passwordResetTokenHash = undefined
            user.passwordResetExpires = undefined
            await user.save()

            return responseReturn(res, 200, {
                message: 'Password reset successful. You can now log in with your new password.'
            })
        } catch (error) {
            console.error('reset_password error:', error.message)
            return responseReturn(res, 500, { error: 'Server error' })
        }
    }
}

module.exports = new passwordResetController()
