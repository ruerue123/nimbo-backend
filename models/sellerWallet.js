const {Schema, model} = require("mongoose");

const sellerWalletSchema = new Schema({
    sellerId: {
        type: String,
        required : true
    },
    // Which order produced this credit. Optional (older rows predate it), but
    // set on all new credits so backfills can skip already-credited orders.
    orderId: {
        type: String
    },
    amount: {
        type: Number,
        required : true
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

module.exports = model('sellerWallets',sellerWalletSchema)