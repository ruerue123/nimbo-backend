const { z } = require('zod')
const { objectIdString } = require('./authSchemas')

const shippingInfoSchema = z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(500),
    phone: z.string().trim().min(1).max(40),
    post: z.string().trim().max(40).optional().default(''),
    province: z.string().trim().max(120).optional().default(''),
    city: z.string().trim().max(120).optional().default(''),
    area: z.string().trim().max(120).optional().default('')
}).passthrough() // let unknown fields through so old clients don't break

// Nested cart structure the storefront sends. We don't pin every inner shape
// strictly because productInfo is whatever the catalog snapshotted — but we
// guard the keys place_order actually reaches into.
const orderProductGroup = z.object({
    sellerId: objectIdString,
    price: z.number().nonnegative().finite(),
    products: z.array(z.object({
        _id: objectIdString.optional(),
        quantity: z.number().int().positive().max(1000),
        productInfo: z.object({}).passthrough()
    })).min(1)
}).passthrough()

const placeOrderSchema = z.object({
    userId: objectIdString,
    price: z.number().nonnegative().finite(),
    shipping_fee: z.number().nonnegative().finite(),
    shippingInfo: shippingInfoSchema,
    products: z.array(orderProductGroup).min(1, 'Cart is empty'),
    // The storefront also sends `items` (total item count). The controller
    // ignores it, but strict() would reject the whole request without it —
    // silently breaking checkout. Accept and drop it.
    items: z.number().int().nonnegative().optional()
}).strict()

const paynowCreateSchema = z.object({
    orderId: objectIdString,
    price: z.number().positive().finite(),
    email: z.string().trim().toLowerCase().email().max(254)
}).strict()

const paynowMobileSchema = z.object({
    orderId: objectIdString,
    price: z.number().positive().finite(),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().regex(/^[0-9+]{7,20}$/, 'Invalid phone number'),
    method: z.enum(['ecocash', 'innbucks'])
}).strict()

module.exports = {
    placeOrderSchema,
    paynowCreateSchema,
    paynowMobileSchema
}
