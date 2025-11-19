const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const categoryController = require('../../controllers/dashboard/categoryController');

// Category Routes
router.post('/category-add', authMiddleware, categoryController.add_category);
router.get('/categories-get', authMiddleware, categoryController.categories_get);
router.get('/category-get/:categoryId', authMiddleware, categoryController.category_get);
router.post('/category-update', authMiddleware, categoryController.category_update);
router.delete('/category-delete/:categoryId', authMiddleware, categoryController.delete_category);

module.exports = router;
