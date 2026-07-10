/**
 * One-off backfill: credit seller + admin wallets for completed orders that
 * never got credited (COD orders, and any pre-fix orders).
 *
 * Idempotent: skips any order that already has a myShopWallet row stamped with
 * its orderId, so it's safe to re-run. Orders credited BEFORE the orderId field
 * existed have no stamp — see the SAFETY note below before running.
 *
 * Run on Render (which has DB_PRO_URL + MODE=pro in its env):
 *   node scripts/backfill-wallets.js          # dry run — prints what it WOULD do
 *   node scripts/backfill-wallets.js --commit # actually writes the wallet rows
 *
 * SAFETY: this assumes seller/admin wallets are currently empty (or only hold
 * correctly-stamped rows). Since COD never credited and the totals show $0,
 * that holds now. If you had partially-correct wallet data, review first.
 */
const mongoose = require('mongoose')
const customerOrder = require('../models/customerOrder')
const authOrder = require('../models/authOrder')
const myShopWallet = require('../models/myShopWallet')
const sellerWallet = require('../models/sellerWallet')

const COMMIT = process.argv.includes('--commit')

async function main() {
    const dbUrl = process.env.DB_PRO_URL || process.env.DB_LOCAL_URL
    if (!dbUrl) throw new Error('No DB URL in env (DB_PRO_URL / DB_LOCAL_URL)')
    await mongoose.connect(dbUrl)
    console.log(`Connected. Mode: ${COMMIT ? 'COMMIT (writing)' : 'DRY RUN (no writes)'}\n`)

    // Completed orders = paid or cod. Those are the sales that earn money.
    const orders = await customerOrder.find({ payment_status: { $in: ['paid', 'cod'] } })
    console.log(`Found ${orders.length} completed (paid/cod) orders.`)

    let credited = 0, skipped = 0, adminTotal = 0, sellerRows = 0

    for (const order of orders) {
        const orderId = order._id.toString()

        // Already credited? (stamped rows only — safe skip on re-run)
        const existing = await myShopWallet.findOne({ orderId })
        if (existing) { skipped++; continue }

        const created = order.createdAt ? new Date(order.createdAt) : new Date()
        const month = created.getMonth() + 1
        const year = created.getFullYear()

        const subs = await authOrder.find({ orderId: order._id })

        if (COMMIT) {
            await myShopWallet.create({ amount: order.price, month, year, orderId })
            for (const s of subs) {
                await sellerWallet.create({
                    sellerId: s.sellerId.toString(), amount: s.price, month, year, orderId
                })
            }
        }

        adminTotal += order.price
        sellerRows += subs.length
        credited++
        console.log(`  ${COMMIT ? 'credited' : 'would credit'} order ${orderId.slice(-8)} — $${order.price} (${subs.length} sub-orders)`)
    }

    console.log(`\n--- Summary ---`)
    console.log(`Orders ${COMMIT ? 'credited' : 'to credit'}: ${credited}`)
    console.log(`Already credited (skipped): ${skipped}`)
    console.log(`Admin sales ${COMMIT ? 'added' : 'to add'}: $${adminTotal.toFixed(2)}`)
    console.log(`Seller wallet rows ${COMMIT ? 'created' : 'to create'}: ${sellerRows}`)
    if (!COMMIT) console.log(`\nDry run only. Re-run with --commit to write.`)

    await mongoose.disconnect()
}

main().catch(e => { console.error('Backfill failed:', e.message); process.exit(1) })
