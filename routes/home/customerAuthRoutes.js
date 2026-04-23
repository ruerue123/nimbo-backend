const customerAuthController = require('../../controllers/home/customerAuthController')
const { authLimiter, registerLimiter } = require('../../middlewares/rateLimiters')
const { validate } = require('../../middlewares/validate')
const { customerRegisterSchema, loginSchema } = require('../../schemas/authSchemas')
const router = require('express').Router()

router.post('/customer/customer-register', registerLimiter, validate(customerRegisterSchema), customerAuthController.customer_register)
router.post('/customer/customer-login', authLimiter, validate(loginSchema), customerAuthController.customer_login)
router.get('/customer/me', customerAuthController.customer_me)

router.get('/customer/logout', customerAuthController.customer_logout)

module.exports = router

