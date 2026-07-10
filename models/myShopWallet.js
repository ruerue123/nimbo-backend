const {Schema, model} = require("mongoose");

const myShopWalletSchema = new Schema({
    amount: {
        type: Number,
        required : true
    },
    // Which order produced this credit. Optional (older rows predate it), but
    // set on all new credits so backfills can skip already-credited orders.
    orderId: {
        type: String
    },
    month: {
        type: Number,
        required : true
    },
    year: {
        type: Number,
        required : true  
    } 
},{ timestamps: true })

module.exports = model('myShopWallets',myShopWalletSchema)