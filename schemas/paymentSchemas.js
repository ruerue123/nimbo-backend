const { z } = require('zod')
const { objectIdString } = require('./authSchemas')

const withdrawalRequestSchema = z.object({
    sellerId: objectIdString,
    amount: z.coerce.number().int().positive().max(1_000_000)
}).strict()

const paymentConfirmSchema = z.object({
    paymentId: objectIdString
}).strict()

module.exports = {
    withdrawalRequestSchema,
    paymentConfirmSchema
}
