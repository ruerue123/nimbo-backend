const formidable = require("formidable");
const { responseReturn } = require("../../utiles/response");
const cloudinary = require('cloudinary').v2;
const categoryModel = require('../../models/categoryModel');

class CategoryController {

    // Add a new category
    async add_category(req, res) {
        const form = formidable();
        form.parse(req, async (err, fields, files) => {
            if (err) return responseReturn(res, 404, { error: 'Something went wrong' });

            try {
                let { name } = fields;
                const { image } = files;
                name = name.trim();
                const slug = name.split(' ').join('-');

                cloudinary.config({
                    cloud_name: process.env.cloud_name,
                    api_key: process.env.api_key,
                    api_secret: process.env.api_secret,
                    secure: true
                });

                const result = await cloudinary.uploader.upload(image.filepath, { folder: 'categories' });

                if (!result) return responseReturn(res, 404, { error: 'Image upload failed' });

                const category = await categoryModel.create({
                    name,
                    slug,
                    image: result.url
                });

                responseReturn(res, 201, { category, message: 'Category added successfully' });

            } catch (error) {
                console.error(error);
                responseReturn(res, 500, { error: 'Internal Server Error' });
            }
        });
    }

    // Get categories with optional pagination and search
    async get_category(req, res) {
        const { page, parPage, searchValue } = req.query;

        try {
            let skipPage = '';
            if (parPage && page) {
                skipPage = parseInt(parPage) * (parseInt(page) - 1);
            }

            let query = {};
            if (searchValue && searchValue.trim() !== '') {
                query = { $text: { $search: searchValue } };
            }

            const categories = await categoryModel.find(query)
                .skip(skipPage)
                .limit(parPage ? parseInt(parPage) : 0)
                .sort({ createdAt: -1 });

            const totalCategory = await categoryModel.countDocuments(query);

            responseReturn(res, 200, { categories, totalCategory });

        } catch (error) {
            console.error(error.message);
            responseReturn(res, 500, { error: 'Internal Server Error' });
        }
    }
    // Get a single category by ID
async category_get(req, res) {
    try {
        const { categoryId } = req.params;
        const category = await categoryModel.findById(categoryId);

        if (!category) {
            return responseReturn(res, 404, { error: 'Category not found' });
        }

        responseReturn(res, 200, { category });

    } catch (error) {
        console.error(error);
        responseReturn(res, 500, { error: 'Internal Server Error' });
    }
}

    // Update an existing category
    async update_category(req, res) {
        const form = formidable();
        form.parse(req, async (err, fields, files) => {
            if (err) return responseReturn(res, 404, { error: 'Something went wrong' });

            try {
                const { id } = req.params;
                let { name } = fields;
                const { image } = files;

                name = name.trim();
                const slug = name.split(' ').join('-');

                let updateData = { name, slug };

                if (image) {
                    cloudinary.config({
                        cloud_name: process.env.cloud_name,
                        api_key: process.env.api_key,
                        api_secret: process.env.api_secret,
                        secure: true
                    });

                    const result = await cloudinary.uploader.upload(image.filepath, { folder: 'categories' });
                    if (result) updateData.image = result.url;
                }

                const category = await categoryModel.findByIdAndUpdate(id, updateData, { new: true });

                if (!category) return responseReturn(res, 404, { error: 'Category not found' });

                responseReturn(res, 200, { category, message: 'Category updated successfully' });

            } catch (error) {
                console.error(error);
                responseReturn(res, 500, { error: 'Internal Server Error' });
            }
        });
    }

    
    // Delete a category
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const deletedCategory = await categoryModel.findByIdAndDelete(id);

            if (!deletedCategory) return res.status(404).json({ message: 'Category not found' });

            res.status(200).json({ message: 'Category deleted successfully' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

module.exports = new CategoryController();
