const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const categoryController = require('../../controllers/dashboard/categoryController');

// Category Routes
router.post('/category-add', authMiddleware, categoryController.add_category);
router.get('/categories-get', authMiddleware, categoryController.get_category);
router.get('/category-get/:categoryId', authMiddleware, categoryController.category_get);
router.post('/category-update/:id', authMiddleware, categoryController.update_category);
router.delete('/category-delete/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;
