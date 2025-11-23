const categoryModel = require('../../models/categoryModel')
const productModel = require('../../models/productModel')
const reviewModel = require('../../models/reviewModel')
const sellerModel = require('../../models/sellerModel')
const { responseReturn } = require("../../utiles/response")
const queryProducts = require('../../utiles/queryProducts')
const moment = require('moment')
const { mongo: {ObjectId}} = require('mongoose')

class homeControllers{

    // Helper method to get active seller IDs
    getActiveSellerIds = async () => {
        const activeSellers = await sellerModel.find({ status: 'active' }).select('_id')
        return activeSellers.map(seller => seller._id)
    }

    formateProduct = (products) => {
        const productArray = [];
        let i = 0;
        while (i < products.length ) {
            let temp = []
            let j = i
            while (j < i + 3) {
                if (products[j]) {
                    temp.push(products[j])
                }
                j++
            }
            productArray.push([...temp])
            i = j
        }
        return productArray
    }

    get_categorys = async(req,res) => {
        try {
            const categorys = await categoryModel.find({})
            responseReturn(res,200, {
                categorys
            })
            
        } catch (error) {
            console.log(error.message)
        }
    }
    // end method 

    get_products = async(req, res) => {
        try {
            // Get only products from active sellers
            const activeSellerIds = await this.getActiveSellerIds()
            const activeFilter = { sellerId: { $in: activeSellerIds } }

            const products = await productModel.find(activeFilter).limit(12).sort({
                createdAt: -1
            })
            const allProduct1 = await productModel.find(activeFilter).limit(9).sort({
                createdAt: -1
            })
            const latest_product = this.formateProduct(allProduct1);

            const allProduct2 = await productModel.find(activeFilter).limit(9).sort({
                rating: -1
            })
            const topRated_product = this.formateProduct(allProduct2);

            const allProduct3 = await productModel.find(activeFilter).limit(9).sort({
                discount: -1
            })
            const discount_product = this.formateProduct(allProduct3);

            responseReturn(res, 200,{
                products,
                latest_product,
                topRated_product,
                discount_product
            })

        } catch (error) {
            console.log(error.message)
        }
    }
   // end method 

   price_range_product = async (req, res) => {
    try {
        // Get only products from active sellers
        const activeSellerIds = await this.getActiveSellerIds()
        const activeFilter = { sellerId: { $in: activeSellerIds } }

        const priceRange = {
            low: 0,
            high: 0,
        }
        const products = await productModel.find(activeFilter).limit(9).sort({
            createdAt: -1 // 1 for asc -1 is for Desc
        })
        const latest_product = this.formateProduct(products);
        const getForPrice = await productModel.find(activeFilter).sort({
            'price': 1
        })
        if (getForPrice.length > 0) {
            priceRange.high = getForPrice[getForPrice.length - 1].price
            priceRange.low = getForPrice[0].price
        }
        responseReturn(res, 200, {
            latest_product,
            priceRange
        })

    } catch (error) {
        console.log(error.message)
    }

   }

// end method 

query_products = async (req, res) => {
    const parPage = 12
    req.query.parPage = parPage

    try {
        // Get only products from active sellers
        const activeSellerIds = await this.getActiveSellerIds()
        const activeFilter = { sellerId: { $in: activeSellerIds } }

        const products = await productModel.find(activeFilter).sort({
            createdAt: -1
        })
        const totalProduct = new queryProducts(products, req.query).categoryQuery().ratingQuery().searchQuery().priceQuery().sortByPrice().countProducts();

        const result = new queryProducts(products, req.query).categoryQuery().ratingQuery().priceQuery().searchQuery().sortByPrice().skip().limit().getProducts();

        responseReturn(res, 200, {
            products: result,
            totalProduct,
            parPage
        })

    } catch (error) {
        console.log(error.message)
    }

}
// end method 

product_details = async (req, res) => {
    const { slug } = req.params
    try {
        const product = await productModel.findOne({slug})

        if (!product) {
            return responseReturn(res, 404, { error: 'Product not found' })
        }

        // Check if the seller is active - if not, don't show the product
        const seller = await sellerModel.findById(product.sellerId)
        if (!seller || seller.status !== 'active') {
            return responseReturn(res, 404, { error: 'Product not available' })
        }

        // Get only products from active sellers for related/more products
        const activeSellerIds = await this.getActiveSellerIds()

        const relatedProducts = await productModel.find({
            $and: [
                { _id: { $ne: product.id } },
                { category: { $eq: product.category } },
                { sellerId: { $in: activeSellerIds } }
            ]
        }).limit(12)

        const moreProducts = await productModel.find({
            $and: [
                { _id: { $ne: product.id } },
                { sellerId: { $eq: product.sellerId } }
            ]
        }).limit(3)

        responseReturn(res, 200, {
            product,
            relatedProducts,
            moreProducts
        })

    } catch (error) {
        console.log(error.message)
    }
}
// end method 

submit_review = async (req, res) => {
     const {productId,rating,review,name} = req.body

     try {
        await reviewModel.create({
            productId,
            name,
            rating,
            review,
            date: moment(Date.now()).format('LL')
        })

        let rat = 0;
        const reviews = await reviewModel.find({
            productId
        })
        for (let i = 0; i < reviews.length; i++) {
            rat = rat + reviews[i].rating 
        }
        let productRating = 0
        if (reviews.length !== 0) {
            productRating = (rat / reviews.length).toFixed(1)
        }

        await productModel.findByIdAndUpdate(productId,{
            rating : productRating
        })
        responseReturn(res, 201, {
            message: "Review Added Successfully"
        })

        
     } catch (error) {
        console.log(error.message)
     }
}
// end method 

get_reviews = async (req, res) => {
    const {productId} = req.params
    let {pageNo} = req.query 
    pageNo = parseInt(pageNo)
    const limit = 5
    const skipPage = limit * (pageNo - 1) 

    try {
        let getRating = await reviewModel.aggregate([{
            $match: {
                productId: {
                    $eq : new ObjectId(productId)
                },
                rating: {
                    $not: {
                        $size: 0
                    }
                }
            }
        },
        {
            $unwind: "$rating"
        },
        {
            $group: {
                _id: "$rating",
                count: {
                    $sum: 1
                }
            }
        } 
    ])
    let rating_review = [{
        rating: 5,
        sum : 0
    },
    {
        rating: 4,
        sum: 0
    },
    {
        rating: 3,
        sum: 0
    },
    {
        rating: 2,
        sum: 0
    },
    {
        rating: 1,
        sum: 0
    }
   ]
   for (let i = 0; i < rating_review.length; i++) {
        for (let j = 0; j < getRating.length; j++) {
            if (rating_review[i].rating === getRating[j]._id) {
                rating_review[i].sum = getRating[j].count
                break
            } 
        }  
   }

   const getAll = await reviewModel.find({
    productId
   })
   const reviews = await reviewModel.find({
    productId
   }).skip(skipPage).limit(limit).sort({createdAt: -1})

   responseReturn(res, 200, {
    reviews,
    totalReview: getAll.length,
    rating_review
   })
        
    } catch (error) {
        console.log(error.message)
    }
}
// end method


}

module.exports = new homeControllers()