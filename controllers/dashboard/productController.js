const formidable = require("formidable");
const { responseReturn } = require("../../utiles/response");
const cloudinary = require("cloudinary").v2;
const productModel = require("../../models/productModel");
const sellerModel = require("../../models/sellerModel");


class productController {

  add_product = async (req, res) => {
    const { id } = req; // seller ID from auth middleware
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      if (err) {
        return responseReturn(res, 400, { error: err.message });
      }

      let { name, category, description, stock, price, discount, brand } = field;
      let { images } = files;

      // Validate seller
      const seller = await sellerModel.findById(id);
      if (!seller) {
        return responseReturn(res, 404, { error: "Seller not found" });
      }

      // Auto-set shop name from vendor profile
      const shopName = seller.shopInfo?.shopName || seller.name;

      name = name.trim();
      const slug = name.split(" ").join("-");

      cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.api_key,
        api_secret: process.env.api_secret,
        secure: true,
      });

      try {
        let allImageUrl = [];

        if (!Array.isArray(images)) {
          images = [images];
        }

        for (let i = 0; i < images.length; i++) {
          const result = await cloudinary.uploader.upload(images[i].filepath, {
            folder: "products",
          });
          allImageUrl.push(result.url);
        }

        await productModel.create({
          sellerId: id,
          name,
          slug,
          shopName, // <= auto-populated from seller
          category: category.trim(),
          description: description.trim(),
          stock: parseInt(stock),
          price: parseInt(price),
          discount: parseInt(discount),
          images: allImageUrl,
          brand: brand.trim(),
        });

        responseReturn(res, 201, { message: "Product Added Successfully" });
      } catch (error) {
        responseReturn(res, 500, { error: error.message });
      }
    });
  };

  // Get all products for a seller
  products_get = async (req, res) => {
    const { id } = req; // seller ID from auth middleware
    const { page, parPage, searchValue } = req.query;

    try {
      let skipPage = 0;
      if (parPage && page) {
        skipPage = parseInt(parPage) * (parseInt(page) - 1);
      }

      let query = { sellerId: id };
      if (searchValue && searchValue.trim() !== '') {
        query.$text = { $search: searchValue };
      }

      const products = await productModel.find(query)
        .skip(skipPage)
        .limit(parPage ? parseInt(parPage) : 0)
        .sort({ createdAt: -1 });

      const totalProduct = await productModel.countDocuments(query);

      responseReturn(res, 200, { products, totalProduct });

    } catch (error) {
      console.error(error);
      responseReturn(res, 500, { error: 'Internal Server Error' });
    }
  };

  // Get a single product by ID
  product_get = async (req, res) => {
    try {
      const { productId } = req.params;
      const product = await productModel.findById(productId);

      if (!product) {
        return responseReturn(res, 404, { error: 'Product not found' });
      }

      responseReturn(res, 200, { product });

    } catch (error) {
      console.error(error);
      responseReturn(res, 500, { error: 'Internal Server Error' });
    }
  };

  // Update product
  product_update = async (req, res) => {
    const form = formidable();
    
    form.parse(req, async (err, fields) => {
      if (err) {
        return responseReturn(res, 400, { error: err.message });
      }

      try {
        let { productId, name, category, description, stock, price, discount, brand } = fields;

        name = name.trim();
        const slug = name.split(" ").join("-");

        const updateData = {
          name,
          slug,
          category: category.trim(),
          description: description.trim(),
          stock: parseInt(stock),
          price: parseInt(price),
          discount: parseInt(discount),
          brand: brand.trim(),
        };

        const product = await productModel.findByIdAndUpdate(productId, updateData, { new: true });

        if (!product) {
          return responseReturn(res, 404, { error: 'Product not found' });
        }

        responseReturn(res, 200, { product, message: 'Product updated successfully' });

      } catch (error) {
        console.error(error);
        responseReturn(res, 500, { error: 'Internal Server Error' });
      }
    });
  };

  // Update product images
  product_image_update = async (req, res) => {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return responseReturn(res, 400, { error: err.message });
      }

      try {
        const { productId, oldImage } = fields;
        let { newImage } = files;

        cloudinary.config({
          cloud_name: process.env.cloud_name,
          api_key: process.env.api_key,
          api_secret: process.env.api_secret,
          secure: true,
        });

        const result = await cloudinary.uploader.upload(newImage.filepath, {
          folder: "products",
        });

        const product = await productModel.findById(productId);

        if (!product) {
          return responseReturn(res, 404, { error: 'Product not found' });
        }

        // Replace old image with new one
        const images = product.images.map(img => 
          img === oldImage ? result.url : img
        );

        await productModel.findByIdAndUpdate(productId, { images });

        responseReturn(res, 200, { message: 'Product image updated successfully' });

      } catch (error) {
        console.error(error);
        responseReturn(res, 500, { error: 'Internal Server Error' });
      }
    });
  };
}

module.exports = new productController();
