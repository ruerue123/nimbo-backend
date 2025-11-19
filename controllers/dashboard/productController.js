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
      const shopName = seller.shopInfo?.storeName || seller.name;

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

  // ... rest of your controller stays unchanged
}

module.exports = new productController();
