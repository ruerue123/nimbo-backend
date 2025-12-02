const {Schema, model} = require("mongoose");

const authSchema = new Schema({
    orderId: {
        type: Schema.ObjectId,
        required : true
    },
    sellerId: {
        type: Schema.ObjectId,
        required : true
    },
    customerId: {
        type: Schema.ObjectId,
        required : false
    },
    customerName: {
        type: String,
        required : false
    },
    products: {
        type: Array,
        required : true
    },
    price: {
        type: Number,
        required : true
    },
    payment_status: {
        type: String,
        required : true
    },
    shippingInfo: {
        type: Schema.Types.Mixed,
        required : true
    },
    delivery_status: {
        type: String,
        required : true
    },
    date: {
        type: String,
        required : true
    },
    // Delivery details added by seller
    deliveryDetails: {
        courierName: { type: String, default: '' },
        courierPhone: { type: String, default: '' },
        estimatedDate: { type: String, default: '' },
        estimatedTime: { type: String, default: '' },
        trackingNumber: { type: String, default: '' },
        notes: { type: String, default: '' }
    }
},{ timestamps: true })

module.exports = model('authorOrders',authSchema)