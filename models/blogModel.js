const { Schema, model } = require('mongoose')

const blogSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['new_seller', 'new_product', 'promotion', 'announcement', 'general'],
        default: 'general'
    },
    // Reference to seller if it's a seller-related post
    sellerId: {
        type: Schema.ObjectId,
        ref: 'sellers',
        default: null
    },
    sellerName: {
        type: String,
        default: ''
    },
    // Reference to product if it's a product-related post
    productId: {
        type: Schema.ObjectId,
        ref: 'products',
        default: null
    },
    productName: {
        type: String,
        default: ''
    },
    productSlug: {
        type: String,
        default: ''
    },
    // Tags for filtering
    tags: [{
        type: String
    }],
    // Status
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    // Views count
    views: {
        type: Number,
        default: 0
    },
    // Featured post
    featured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

// Create text index for search
blogSchema.index({ title: 'text', content: 'text', tags: 'text' })

module.exports = model('blogs', blogSchema)
