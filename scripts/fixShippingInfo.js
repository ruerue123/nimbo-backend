const mongoose = require('mongoose');
const authOrderModel = require('../models/authOrder');
const customerOrder = require('../models/customerOrder');
require('dotenv').config();

// Connect to MongoDB
const dbUrl = process.env.DB_PRO_URL || process.env.DB_LOCAL_URL;
console.log('Connecting to database...');
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
    fixShippingInfo();
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

async function fixShippingInfo() {
    try {
        console.log('🔧 Starting to fix shipping info for all seller orders...\n');

        // Get all seller orders
        const sellerOrders = await authOrderModel.find({});
        console.log(`Found ${sellerOrders.length} seller orders to process\n`);

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const sellerOrder of sellerOrders) {
            try {
                // Check if shippingInfo is already an object (already fixed)
                if (typeof sellerOrder.shippingInfo === 'object' &&
                    sellerOrder.shippingInfo !== null &&
                    sellerOrder.shippingInfo.name) {
                    console.log(`⏭️  Skipping order ${sellerOrder._id} - already has valid shippingInfo object`);
                    skipped++;
                    continue;
                }

                // Find the customer order
                const custOrder = await customerOrder.findById(sellerOrder.orderId);

                if (!custOrder) {
                    console.log(`⚠️  Warning: Customer order not found for seller order ${sellerOrder._id}`);
                    errors++;
                    continue;
                }

                // Update the seller order with correct data from customer order
                await authOrderModel.findByIdAndUpdate(sellerOrder._id, {
                    shippingInfo: custOrder.shippingInfo,
                    customerId: custOrder.customerId,
                    customerName: custOrder.shippingInfo?.name || ''
                });

                console.log(`✅ Fixed order ${sellerOrder._id} - Customer: ${custOrder.shippingInfo?.name || 'N/A'}`);
                fixed++;

            } catch (err) {
                console.error(`❌ Error processing order ${sellerOrder._id}:`, err.message);
                errors++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Fixed: ${fixed}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Total: ${sellerOrders.length}`);
        console.log('\n✨ Migration complete!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}
