const { Schema, model } = require('mongoose')

const customerOrder = new Schema({
    customerId : {
        type : Schema.ObjectId,
        required : true
    },
    products : {
        type : Array,
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    payment_status : {
        type : String,
        required : true
    },
    shippingInfo : {
        type : Object,
        required : true
    },
    delivery_status : {
        type : String,
        required : true
    },
    date : {
        type : String,
        required : true
    },
    // Paynow payment fields
    paynowPollUrl : {
        type : String,
        default : ''
    },
    paynowReference : {
        type : String,
        default : ''
    },
    // Delivery details (synced from seller orders)
    deliveryDetails: {
        courierName: { type: String, default: '' },
        courierPhone: { type: String, default: '' },
        estimatedDate: { type: String, default: '' },
        estimatedTime: { type: String, default: '' },
        trackingNumber: { type: String, default: '' },
        notes: { type: String, default: '' }
    }
},{timestamps : true})

module.exports = model('customerOrders',customerOrder)