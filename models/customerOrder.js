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
    }
},{timestamps : true})

module.exports = model('customerOrders',customerOrder)