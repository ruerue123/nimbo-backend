const authControllers = require('../controllers/authControllers')
const { authMiddleware } = require('../middlewares/authMiddleware')
const { authLimiter, registerLimiter } = require('../middlewares/rateLimiters')
const { validate } = require('../middlewares/validate')
const {
    loginSchema,
    sellerRegisterSchema,
    changePasswordSchema,
    profileInfoSchema
} = require('../schemas/authSchemas')
const router = require('express').Router()

router.post('/admin-login', authLimiter, validate(loginSchema), authControllers.admin_login)
router.get('/get-user', authMiddleware, authControllers.getUser)
router.post('/seller-register', registerLimiter, validate(sellerRegisterSchema), authControllers.seller_register)
router.post('/seller-login', authLimiter, validate(loginSchema), authControllers.seller_login)
router.post('/profile-image-upload', authMiddleware, authControllers.profile_image_upload)
router.post('/profile-info-add', authMiddleware, validate(profileInfoSchema), authControllers.profile_info_add)

router.post('/change-password', authMiddleware, authLimiter, validate(changePasswordSchema), authControllers.change_password)

router.get('/logout', authMiddleware, authControllers.logout)

module.exports = router

