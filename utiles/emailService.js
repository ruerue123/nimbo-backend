const nodemailer = require('nodemailer')

// Create transporter - configure with your email service
// For production, use services like SendGrid, Mailgun, or AWS SES
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Gmail SMTP from cloud IPs (Render) can stall on the STARTTLS/greeting
        // handshake. Cap each phase so a bad connection fails in seconds instead
        // of hanging the request for a minute.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })
}

// Resend HTTP API sender. Preferred over Gmail SMTP because it sends in <1s
// over plain HTTPS (no SMTP handshake that Gmail throttles from cloud IPs) and
// has proper transactional deliverability. Enabled by setting RESEND_API_KEY;
// EMAIL_FROM should be a verified sender (e.g. "Nimbo <noreply@nimbo.co.zw>",
// or "onboarding@resend.dev" while testing before domain verification).
const resendConfigured = () => !!process.env.RESEND_API_KEY

const sendViaResend = async (to, subject, html) => {
    const from = process.env.EMAIL_FROM || 'Nimbo <onboarding@resend.dev>'
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, html })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data?.message || `Resend API ${res.status}`)
    }
    return { success: true, messageId: data.id }
}

// Email templates
const emailTemplates = {
    newMessage: (senderName, message, chatLink) => ({
        subject: `New message from ${senderName} on Nimbo`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .message-box { background: #f0fdfa; border-left: 4px solid #06b6d4; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .message-text { color: #374151; font-size: 16px; line-height: 1.6; margin: 0; }
                    .sender { color: #06b6d4; font-weight: 600; margin-bottom: 8px; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Message</h1>
                    </div>
                    <div class="content">
                        <p style="color: #374151;">You have a new message on Nimbo:</p>
                        <div class="message-box">
                            <p class="sender">${senderName} says:</p>
                            <p class="message-text">"${message}"</p>
                        </div>
                        <a href="${chatLink}" class="cta-button">Reply Now</a>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Nimbo Marketplace</p>
                        <p>&copy; ${new Date().getFullYear()} Nimbo. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    deliveryUpdate: (orderInfo, deliveryDetails) => ({
        subject: `Delivery Update for Order #${orderInfo.orderId?.slice(-8) || 'N/A'}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .delivery-box { background: #faf5ff; border-radius: 12px; padding: 20px; margin: 20px 0; }
                    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e9d5ff; }
                    .detail-row:last-child { border-bottom: none; }
                    .detail-label { color: #7c3aed; font-weight: 600; width: 140px; }
                    .detail-value { color: #374151; flex: 1; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Delivery Update</h1>
                    </div>
                    <div class="content">
                        <p style="color: #374151;">Great news! The seller has updated the delivery details for your order:</p>
                        <div class="delivery-box">
                            ${deliveryDetails.courierName ? `
                            <div class="detail-row">
                                <span class="detail-label">Courier/Driver:</span>
                                <span class="detail-value">${deliveryDetails.courierName}</span>
                            </div>` : ''}
                            ${deliveryDetails.courierPhone ? `
                            <div class="detail-row">
                                <span class="detail-label">Contact:</span>
                                <span class="detail-value">${deliveryDetails.courierPhone}</span>
                            </div>` : ''}
                            ${deliveryDetails.estimatedDate ? `
                            <div class="detail-row">
                                <span class="detail-label">Expected Date:</span>
                                <span class="detail-value">${new Date(deliveryDetails.estimatedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>` : ''}
                            ${deliveryDetails.estimatedTime ? `
                            <div class="detail-row">
                                <span class="detail-label">Expected Time:</span>
                                <span class="detail-value">${deliveryDetails.estimatedTime}</span>
                            </div>` : ''}
                            ${deliveryDetails.trackingNumber ? `
                            <div class="detail-row">
                                <span class="detail-label">Tracking #:</span>
                                <span class="detail-value">${deliveryDetails.trackingNumber}</span>
                            </div>` : ''}
                            ${deliveryDetails.notes ? `
                            <div class="detail-row">
                                <span class="detail-label">Note:</span>
                                <span class="detail-value">${deliveryDetails.notes}</span>
                            </div>` : ''}
                        </div>
                        <a href="${process.env.FRONTEND_URL || 'https://www.nimbo.co.zw'}/dashboard/order/details/${orderInfo.orderId}" class="cta-button">View Order</a>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Nimbo Marketplace</p>
                        <p>&copy; ${new Date().getFullYear()} Nimbo. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    passwordReset: (resetUrl, accountLabel) => ({
        subject: 'Reset your Nimbo password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; color: #374151; line-height: 1.6; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 20px 0; }
                    .url-box { background: #f0fdfa; border-left: 4px solid #06b6d4; padding: 12px 16px; word-break: break-all; font-size: 12px; color: #0e7490; border-radius: 8px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset</h1>
                    </div>
                    <div class="content">
                        <p>Hi${accountLabel ? ` ${accountLabel}` : ''},</p>
                        <p>We received a request to reset the password for your Nimbo account. Click the button below to choose a new password. This link expires in 1 hour.</p>
                        <p style="text-align: center;"><a href="${resetUrl}" class="cta-button">Reset Password</a></p>
                        <p>If the button doesn't work, paste this URL into your browser:</p>
                        <div class="url-box">${resetUrl}</div>
                        <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you didn't ask to reset your password, you can ignore this email — your password won't change.</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Nimbo Marketplace</p>
                        <p>&copy; ${new Date().getFullYear()} Nimbo. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    verificationCode: (code, accountLabel) => ({
        subject: 'Your Nimbo verification code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; color: #374151; line-height: 1.6; text-align: center; }
                    .code { display: inline-block; background: #f0fdfa; border: 2px dashed #06b6d4; color: #0e7490; font-size: 36px; font-weight: 700; letter-spacing: 10px; padding: 18px 28px; border-radius: 12px; margin: 20px 0; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Verify your email</h1>
                    </div>
                    <div class="content">
                        <p>Hi${accountLabel ? ` ${accountLabel}` : ''}, welcome to Nimbo! Enter this code to verify your email and finish setting up your account:</p>
                        <div class="code">${code}</div>
                        <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes. If you didn't create a Nimbo account, you can ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Nimbo Marketplace</p>
                        <p>&copy; ${new Date().getFullYear()} Nimbo. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    orderStatusUpdate: (orderInfo, newStatus) => ({
        subject: `Order #${orderInfo.orderId?.slice(-8) || 'N/A'} Status: ${newStatus.replace('_', ' ').toUpperCase()}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; text-align: center; }
                    .status-badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 12px 24px; border-radius: 50px; font-weight: 600; font-size: 18px; margin: 20px 0; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Status Update</h1>
                    </div>
                    <div class="content">
                        <p style="color: #374151;">Your order status has been updated:</p>
                        <div class="status-badge">${newStatus.replace('_', ' ').toUpperCase()}</div>
                        <p style="color: #6b7280;">Order ID: #${orderInfo.orderId?.slice(-8) || 'N/A'}</p>
                        <a href="${process.env.FRONTEND_URL || 'https://www.nimbo.co.zw'}/dashboard/order/details/${orderInfo.orderId}" class="cta-button">Track Order</a>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Nimbo Marketplace</p>
                        <p>&copy; ${new Date().getFullYear()} Nimbo. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
}

// Send email function
const sendEmail = async (to, template, data) => {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('Email skipped: SMTP not configured')
        return { success: false, reason: 'SMTP not configured' }
    }

    try {
        const transporter = createTransporter()
        const emailContent = emailTemplates[template](data.senderName || data.orderInfo, data.message || data.deliveryDetails || data.newStatus, data.chatLink || '')

        const info = await transporter.sendMail({
            from: `"Nimbo Marketplace" <${process.env.SMTP_USER}>`,
            to: to,
            subject: emailContent.subject,
            html: emailContent.html
        })

        console.log('Email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.log('Email error:', error.message)
        return { success: false, error: error.message }
    }
}

// Specific email functions
const sendNewMessageEmail = async (recipientEmail, senderName, message, chatLink) => {
    return sendEmail(recipientEmail, 'newMessage', { senderName, message, chatLink })
}

const sendDeliveryUpdateEmail = async (recipientEmail, orderInfo, deliveryDetails) => {
    return sendEmail(recipientEmail, 'deliveryUpdate', { orderInfo, deliveryDetails })
}

const sendOrderStatusEmail = async (recipientEmail, orderInfo, newStatus) => {
    return sendEmail(recipientEmail, 'orderStatusUpdate', { orderInfo, newStatus })
}

// Password reset emails carry a one-shot URL, so we bypass the generic
// `sendEmail` (which is shaped around chat/order args). When SMTP isn't
// configured in dev we log the URL to the server console so resets are
// still testable locally without real credentials.
const sendPasswordResetEmail = async (recipientEmail, resetUrl, accountLabel = '') => {
    // Prefer Resend (fast HTTP API) when configured.
    if (resendConfigured()) {
        try {
            const { subject, html } = emailTemplates.passwordReset(resetUrl, accountLabel)
            const info = await sendViaResend(recipientEmail, subject, html)
            console.log('Password reset email sent (resend):', info.messageId)
            return info
        } catch (error) {
            console.log('Password reset email error (resend):', error.message)
            return { success: false, error: error.message }
        }
    }

    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS
    if (!smtpConfigured) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n=== PASSWORD RESET (SMTP not configured) ===')
            console.log(`To: ${recipientEmail}`)
            console.log(`Reset URL: ${resetUrl}`)
            console.log('============================================\n')
            return { success: true, dev: true }
        }
        console.log('Password reset email skipped: SMTP not configured')
        return { success: false, reason: 'SMTP not configured' }
    }

    try {
        const transporter = createTransporter()
        const { subject, html } = emailTemplates.passwordReset(resetUrl, accountLabel)
        const info = await transporter.sendMail({
            from: `"Nimbo Marketplace" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject,
            html
        })
        console.log('Password reset email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.log('Password reset email error:', error.message)
        return { success: false, error: error.message }
    }
}

// Signup verification codes. Mirrors sendPasswordResetEmail: bypasses the
// generic sendEmail (which is shaped around chat/order args) and logs the code
// to the console in dev when SMTP isn't configured so signup stays testable.
const sendVerificationEmail = async (recipientEmail, code, accountLabel = '') => {
    // Prefer Resend (fast HTTP API) when configured.
    if (resendConfigured()) {
        try {
            const { subject, html } = emailTemplates.verificationCode(code, accountLabel)
            const info = await sendViaResend(recipientEmail, subject, html)
            console.log('Verification email sent (resend):', info.messageId)
            return info
        } catch (error) {
            console.log('Verification email error (resend):', error.message)
            return { success: false, error: error.message }
        }
    }

    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS
    if (!smtpConfigured) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n=== EMAIL VERIFICATION (SMTP not configured) ===')
            console.log(`To: ${recipientEmail}`)
            console.log(`Code: ${code}`)
            console.log('================================================\n')
            return { success: true, dev: true }
        }
        console.log('Verification email skipped: SMTP not configured')
        return { success: false, reason: 'SMTP not configured' }
    }

    try {
        const transporter = createTransporter()
        const { subject, html } = emailTemplates.verificationCode(code, accountLabel)
        const info = await transporter.sendMail({
            from: `"Nimbo Marketplace" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject,
            html
        })
        console.log('Verification email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.log('Verification email error:', error.message)
        return { success: false, error: error.message }
    }
}

// Contact-form submissions. Delivered to the support inbox with the visitor's
// address as reply-to, so staff can reply straight from the notification.
const contactTemplate = (name, email, message) => ({
    subject: `New contact message from ${name}`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 24px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 20px; }
                .content { padding: 24px; color: #374151; line-height: 1.6; }
                .row { margin-bottom: 12px; }
                .label { color: #06b6d4; font-weight: 600; }
                .message-box { background: #f0fdfa; border-left: 4px solid #06b6d4; padding: 14px; border-radius: 8px; margin-top: 8px; white-space: pre-wrap; }
                .footer { background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>New Contact Message</h1></div>
                <div class="content">
                    <div class="row"><span class="label">Name:</span> ${name}</div>
                    <div class="row"><span class="label">Email:</span> ${email}</div>
                    <div class="row"><span class="label">Message:</span>
                        <div class="message-box">${message}</div>
                    </div>
                </div>
                <div class="footer">Sent from the Nimbo contact form</div>
            </div>
        </body>
        </html>
    `
})

const sendContactEmail = async (name, email, message) => {
    const to = process.env.CONTACT_INBOX || 'info@nimbo.co.zw'
    const { subject, html } = contactTemplate(name, email, message)

    if (resendConfigured()) {
        try {
            const from = process.env.EMAIL_FROM || 'Nimbo <onboarding@resend.dev>'
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ from, to, subject, html, reply_to: email })
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.message || `Resend API ${res.status}`)
            console.log('Contact email sent (resend):', data.id)
            return { success: true, messageId: data.id }
        } catch (error) {
            console.log('Contact email error (resend):', error.message)
            return { success: false, error: error.message }
        }
    }

    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS
    if (!smtpConfigured) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n=== CONTACT MESSAGE (email not configured) ===')
            console.log(`From: ${name} <${email}>`)
            console.log(`Message: ${message}`)
            console.log('==============================================\n')
            return { success: true, dev: true }
        }
        return { success: false, reason: 'Email not configured' }
    }

    try {
        const transporter = createTransporter()
        const info = await transporter.sendMail({
            from: `"Nimbo Contact" <${process.env.SMTP_USER}>`,
            to, subject, html, replyTo: email
        })
        console.log('Contact email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.log('Contact email error:', error.message)
        return { success: false, error: error.message }
    }
}

module.exports = {
    sendEmail,
    sendNewMessageEmail,
    sendDeliveryUpdateEmail,
    sendOrderStatusEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
    sendContactEmail
}
