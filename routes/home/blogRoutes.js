const blogController = require('../../controllers/home/blogController')
const router = require('express').Router()

// Public blog routes
router.get('/blogs', blogController.get_blogs)
router.get('/blogs/featured', blogController.get_featured_blogs)
router.get('/blogs/latest', blogController.get_latest_blogs)
router.get('/blog/:slug', blogController.get_blog)

// Admin route for creating blogs manually
router.post('/blog/create', blogController.create_blog)

module.exports = router
