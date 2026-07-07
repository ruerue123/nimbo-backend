// SMTP sanity check. Run with your Gmail creds in the env:
//   SMTP_USER=you@gmail.com SMTP_PASS='16charapppass' TEST_TO=you@gmail.com node scripts/test-smtp.js
const nodemailer = require('nodemailer')
async function main() {
    const { SMTP_USER, SMTP_PASS, TEST_TO } = process.env
    if (!SMTP_USER || !SMTP_PASS) { console.error('Missing SMTP_USER/SMTP_PASS'); process.exit(1) }
    const t = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    })
    console.log('Verifying login...'); await t.verify(); console.log('✅ login OK')
    const info = await t.sendMail({
        from: `"Nimbo" <${SMTP_USER}>`, to: TEST_TO || SMTP_USER,
        subject: 'Nimbo SMTP test', text: 'SMTP works.'
    })
    console.log('✅ sent:', info.messageId)
}
main().catch(e => { console.error('❌ failed:', e.message); process.exit(1) })
