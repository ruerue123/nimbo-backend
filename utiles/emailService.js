const nodemailer = require('nodemailer')

// Create transporter - configure with your email service
// For production, use services like SendGrid, Mailgun, or AWS SES
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
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

module.exports = {
    sendEmail,
    sendNewMessageEmail,
    sendDeliveryUpdateEmail,
    sendOrderStatusEmail
}
