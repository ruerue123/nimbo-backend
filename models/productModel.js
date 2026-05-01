const {Schema, model} = require("mongoose");

const productSchema = new Schema({
    sellerId: {
        type: Schema.ObjectId,
        ref: "sellers",
        required : true
    },
    name: {
        type: String,
        required : true
    },
    slug: {
        type: String,
        required : true
    },
    category: {
        type: String,
        required : true
    },
    brand: {
        type: String,
        required : true
    },
    price: {
        type: Number,
        required : true
    },
    stock: {
        type: Number,
        required : true
    },
    discount: {
        type: Number,
        required : true
    },
    description: {
        type: String,
        required : true
    },
    shopName: {
        type: String,
        required : true
    },
    images: {
        type: Array,
        required : true
    },
    rating: {
        type: Number,
        default : 0
    },
    // Optional product variants. When `hasVariants` is true, `variants` is the
    // source of truth for stock — the top-level `stock` field is recomputed as
    // the sum of variant stocks at write time. When false, the product behaves
    // as before (single stock count, no size/color choice at checkout).
    hasVariants: {
        type: Boolean,
        default: false
    },
    sizes: [{
        type: String,
        trim: true,
        maxlength: 32
    }],
    colors: [{
        name: { type: String, trim: true, maxlength: 64 },
        hex: { type: String, trim: true, maxlength: 16 }
    }],
    variants: [{
        size: { type: String, trim: true, maxlength: 32, default: '' },
        color: { type: String, trim: true, maxlength: 64, default: '' },
        stock: { type: Number, min: 0, default: 0 }
    }]

}, {timestamps: true})

productSchema.index({
    name: 'text',
    category: 'text',
    brand: 'text',
    description: 'text'
},{
    weights: {
        name: 5,
        category: 4,
        brand: 3,
        description: 2
    }

})

module.exports = model('products',productSchema)