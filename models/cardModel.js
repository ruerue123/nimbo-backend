const {Schema, model} = require("mongoose");

const cardSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        required : true
    },
    productId: {
        type: Schema.ObjectId,
        required : true
    },
    quantity: {
        type: Number,
        required : true,
    },
    // Optional — set only when the product has variants. Lets the same
    // productId appear multiple times in a cart with different size/color
    // combos, and gives the order pipeline what it needs to deduct stock
    // from the right variant later.
    selectedSize: {
        type: String,
        default: ''
    },
    selectedColor: {
        type: String,
        default: ''
    }
},{ timestamps: true })

module.exports = model('cardProducts',cardSchema)