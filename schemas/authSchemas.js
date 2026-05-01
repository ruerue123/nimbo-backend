const { z } = require('zod')

// Mongo ObjectId — accept plain 24-char hex strings. Models still re-validate
// on their own when casting, so this is a cheap first-pass guard.
const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')

const email = z.string().trim().toLowerCase().email().max(254)
const password = z.string().min(8, 'Password must be at least 8 characters').max(128)
const name = z.string().trim().min(1, 'Name is required').max(120)

const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Password is required').max(128)
}).strict()

const customerRegisterSchema = z.object({
    name,
    email,
    password
}).strict()

const sellerRegisterSchema = z.object({
    name,
    email,
    password
}).strict()

const changePasswordSchema = z.object({
    old_password: z.string().min(1, 'Old password is required').max(128),
    new_password: password
}).strict().refine(
    (data) => data.old_password !== data.new_password,
    { path: ['new_password'], message: 'New password must differ from old password' }
)

const role = z.enum(['customer', 'seller', 'admin'])

const forgotPasswordSchema = z.object({
    email,
    role
}).strict()

const resetPasswordSchema = z.object({
    token: z.string().min(20).max(256),
    role,
    new_password: password
}).strict()

const profileInfoSchema = z.object({
    division: z.string().trim().max(120).optional().default(''),
    district: z.string().trim().max(120).optional().default(''),
    sub_district: z.string().trim().max(120).optional().default(''),
    shopName: z.string().trim().min(1, 'Shop name is required').max(120)
}).strict()

module.exports = {
    objectIdString,
    loginSchema,
    customerRegisterSchema,
    sellerRegisterSchema,
    changePasswordSchema,
    profileInfoSchema,
    forgotPasswordSchema,
    resetPasswordSchema
}
