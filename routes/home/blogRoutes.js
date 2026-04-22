const blogController = require('../../controllers/home/blogController')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const router = require('express').Router()

// Public blog routes
router.get('/blogs', blogController.get_blogs)
router.get('/blogs/featured', blogController.get_featured_blogs)
router.get('/blogs/latest', blogController.get_latest_blogs)
router.get('/blog/:slug', blogController.get_blog)

// Admin-only: create blog manually. Controller also checks role === 'admin'.
router.post('/blog/create', authMiddleware, blogController.create_blog)

module.exports = router
