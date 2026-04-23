const customerAuthController = require('../../controllers/home/customerAuthController')
const { authLimiter, registerLimiter } = require('../../middlewares/rateLimiters')
const router = require('express').Router()

router.post('/customer/customer-register', registerLimiter, customerAuthController.customer_register)
router.post('/customer/customer-login', authLimiter, customerAuthController.customer_login)
router.get('/customer/me', customerAuthController.customer_me)

router.get('/customer/logout', customerAuthController.customer_logout)

module.exports = router
