const blogModel = require('../../models/blogModel')
const { responseReturn } = require('../../utiles/response')

class blogController {

    // Get all published blogs with pagination
    get_blogs = async (req, res) => {
        let { page, parPage, category, searchValue } = req.query
        page = parseInt(page) || 1
        parPage = parseInt(parPage) || 10
        const skipPage = parPage * (page - 1)

        try {
            let query = { status: 'published' }

            if (category && category !== 'all') {
                query.category = category
            }

            if (searchValue) {
                query.$text = { $search: searchValue }
            }

            const blogs = await blogModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skipPage)
                .limit(parPage)

            const totalBlogs = await blogModel.countDocuments(query)

            responseReturn(res, 200, { blogs, totalBlogs })
        } catch (error) {
            console.log('Get blogs error:', error.message)
            responseReturn(res, 500, { error: 'Internal server error' })
        }
    }

    // Get featured blogs
    get_featured_blogs = async (req, res) => {
        try {
            const blogs = await blogModel.find({
                status: 'published',
                featured: true
            })
            .sort({ createdAt: -1 })
            .limit(5)

            responseReturn(res, 200, { blogs })
        } catch (error) {
            console.log('Get featured blogs error:', error.message)
            responseReturn(res, 500, { error: 'Internal server error' })
        }
    }

    // Get single blog by slug
    get_blog = async (req, res) => {
        const { slug } = req.params

        try {
            const blog = await blogModel.findOneAndUpdate(
                { slug },
                { $inc: { views: 1 } },
                { new: true }
            )

            if (!blog) {
                return responseReturn(res, 404, { error: 'Blog not found' })
            }

            // Get related blogs
            const relatedBlogs = await blogModel.find({
                _id: { $ne: blog._id },
                status: 'published',
                $or: [
                    { category: blog.category },
                    { tags: { $in: blog.tags } }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(3)

            responseReturn(res, 200, { blog, relatedBlogs })
        } catch (error) {
            console.log('Get blog error:', error.message)
            responseReturn(res, 500, { error: 'Internal server error' })
        }
    }

    // Get latest blogs for homepage
    get_latest_blogs = async (req, res) => {
        try {
            const blogs = await blogModel.find({ status: 'published' })
                .sort({ createdAt: -1 })
                .limit(6)

            responseReturn(res, 200, { blogs })
        } catch (error) {
            console.log('Get latest blogs error:', error.message)
            responseReturn(res, 500, { error: 'Internal server error' })
        }
    }

    // Create blog post (used internally for auto-posts)
    create_blog = async (req, res) => {
        const { title, content, excerpt, image, category, sellerId, sellerName, productId, productName, tags, featured } = req.body

        try {
            // Generate slug from title
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + '-' + Date.now()

            const blog = await blogModel.create({
                title,
                slug,
                content,
                excerpt,
                image,
                category,
                sellerId,
                sellerName,
                productId,
                productName,
                tags: tags || [],
                featured: featured || false,
                status: 'published'
            })

            responseReturn(res, 201, { message: 'Blog created successfully', blog })
        } catch (error) {
            console.log('Create blog error:', error.message)
            responseReturn(res, 500, { error: 'Internal server error' })
        }
    }

    // Auto-create blog when seller is approved
    create_seller_blog = async (sellerInfo) => {
        try {
            const title = `Welcome ${sellerInfo.shopInfo?.shopName || sellerInfo.name} to Nimbo!`
            const slug = `welcome-${(sellerInfo.shopInfo?.shopName || sellerInfo.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

            const content = `
                <p>We're excited to announce that <strong>${sellerInfo.shopInfo?.shopName || sellerInfo.name}</strong> has joined the Nimbo marketplace!</p>

                <h3>About the Seller</h3>
                <p>${sellerInfo.shopInfo?.description || 'A new seller offering quality products.'}</p>

                <h3>What They Offer</h3>
                <p>Browse their store to discover amazing products at great prices. ${sellerInfo.shopInfo?.shopName || sellerInfo.name} is committed to providing excellent customer service and quality products.</p>

                <h3>Location</h3>
                <p>${sellerInfo.shopInfo?.province || ''} ${sellerInfo.shopInfo?.city ? ', ' + sellerInfo.shopInfo.city : ''}</p>

                <p>Visit their store today and be among the first to shop from this exciting new seller!</p>
            `

            const excerpt = `${sellerInfo.shopInfo?.shopName || sellerInfo.name} has joined Nimbo marketplace. Discover their amazing products and great deals!`

            await blogModel.create({
                title,
                slug,
                content,
                excerpt,
                image: sellerInfo.image || '',
                category: 'new_seller',
                sellerId: sellerInfo._id,
                sellerName: sellerInfo.shopInfo?.shopName || sellerInfo.name,
                tags: ['new seller', 'welcome', sellerInfo.shopInfo?.province || ''].filter(Boolean),
                status: 'published',
                featured: true
            })

            console.log(`Blog created for new seller: ${sellerInfo.shopInfo?.shopName || sellerInfo.name}`)
        } catch (error) {
            console.log('Create seller blog error:', error.message)
        }
    }

    // Auto-create blog when new product is added
    create_product_blog = async (productInfo, sellerInfo) => {
        try {
            // Only create blog for products with significant discount or featured products
            if (productInfo.discount < 10 && !productInfo.featured) {
                return
            }

            const hasDiscount = productInfo.discount > 0
            const title = hasDiscount
                ? `${productInfo.discount}% OFF: ${productInfo.name} - Limited Time Offer!`
                : `New Arrival: ${productInfo.name} Now Available!`

            const slug = `${productInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

            const discountPrice = productInfo.price - Math.floor((productInfo.price * productInfo.discount) / 100)

            const content = `
                <p>Check out this ${hasDiscount ? 'amazing deal' : 'new product'} from <strong>${sellerInfo?.shopInfo?.shopName || 'our trusted seller'}</strong>!</p>

                <h3>${productInfo.name}</h3>
                <p>${productInfo.description || 'A quality product at a great price.'}</p>

                ${hasDiscount ? `
                <h3>Special Offer</h3>
                <p><strong>${productInfo.discount}% OFF!</strong></p>
                <p>Original Price: <del>$${productInfo.price}</del></p>
                <p>Sale Price: <strong>$${discountPrice}</strong></p>
                ` : `
                <h3>Price</h3>
                <p>Only <strong>$${productInfo.price}</strong></p>
                `}

                <h3>Category</h3>
                <p>${productInfo.category || 'General'}</p>

                <p>Don't miss out on this ${hasDiscount ? 'limited time offer' : 'new arrival'}! Shop now before it's gone.</p>
            `

            const excerpt = hasDiscount
                ? `Get ${productInfo.discount}% off on ${productInfo.name}! Was $${productInfo.price}, now just $${discountPrice}. Limited time offer!`
                : `New arrival! ${productInfo.name} is now available at ${sellerInfo?.shopInfo?.shopName || 'Nimbo'}. Shop now!`

            await blogModel.create({
                title,
                slug,
                content,
                excerpt,
                image: productInfo.images?.[0] || '',
                category: hasDiscount ? 'promotion' : 'new_product',
                sellerId: productInfo.sellerId,
                sellerName: sellerInfo?.shopInfo?.shopName || '',
                productId: productInfo._id,
                productName: productInfo.name,
                tags: [productInfo.category, hasDiscount ? 'sale' : 'new arrival', productInfo.brand].filter(Boolean),
                status: 'published',
                featured: hasDiscount && productInfo.discount >= 20
            })

            console.log(`Blog created for product: ${productInfo.name}`)
        } catch (error) {
            console.log('Create product blog error:', error.message)
        }
    }
}

module.exports = new blogController()
