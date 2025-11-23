const authOrderModel = require('../../models/authOrder')
const customerOrder = require('../../models/customerOrder')

const myShopWallet = require('../../models/myShopWallet')
const sellerWallet = require('../../models/sellerWallet')

const cardModel = require('../../models/cardModel')
const moment = require("moment")
const { responseReturn } = require('../../utiles/response')
const { mongo: {ObjectId}} = require('mongoose')

// Paynow Integration
const { Paynow } = require('paynow')
const paynow = new Paynow('22615', '9245e4f0-0955-4eae-9c9c-9ddf27cbfde9')
paynow.resultUrl = process.env.PAYNOW_RESULT_URL
paynow.returnUrl = process.env.PAYNOW_RETURN_URL

class orderController{

    paymentCheck = async (id) => {
        try {
            const order = await customerOrder.findById(id)
            if (order.payment_status === 'unpaid') {
                await customerOrder.findByIdAndUpdate(id, {
                    delivery_status: 'cancelled'
                })
                await authOrderModel.updateMany({
                    orderId: id
                },{
                    delivery_status: 'cancelled'
                })
            }
            return true
        } catch (error) {
            console.log(error)
        }
    }

    // end method 
      
    place_order = async (req,res) => {
        const {price,products,shipping_fee,shippingInfo,userId } = req.body
        let authorOrderData = []
        let cardId = []
        const tempDate = moment(Date.now()).format('LLL')

        let customerOrderProduct = []

        for (let i = 0; i < products.length; i++) {
            const pro = products[i].products
            for (let j = 0; j < pro.length; j++) {
                const tempCusPro = pro[j].productInfo;
                tempCusPro.quantity = pro[j].quantity
                customerOrderProduct.push(tempCusPro)
                if (pro[j]._id) {
                    cardId.push(pro[j]._id)
                } 
            } 
        }

        try {
            const order = await customerOrder.create({
                customerId: userId,
                shippingInfo,
                products: customerOrderProduct,
                price: price + shipping_fee,
                payment_status: 'unpaid',
                delivery_status: 'pending',
                date: tempDate
            })
            for (let i = 0; i < products.length; i++) {
                const pro = products[i].products
                const pri = products[i].price
                const sellerId = products[i].sellerId
                let storePor = []
                for (let j = 0; j < pro.length; j++) {
                    const tempPro = pro[j].productInfo
                    tempPro.quantity = pro[j].quantity
                    storePor.push(tempPro)                    
                }

                authorOrderData.push({
                    orderId: order.id,sellerId,
                    products: storePor,
                    price:pri,
                    payment_status: 'unpaid',
                    shippingInfo: 'Easy Main Warehouse',
                    delivery_status: 'pending',
                    date: tempDate
                }) 
            }

            await authOrderModel.insertMany(authorOrderData)
            for (let k = 0; k < cardId.length; k++) {
                await cardModel.findByIdAndDelete(cardId[k]) 
            }
   
            setTimeout(() => {
                this.paymentCheck(order.id)
            }, 15000)

            responseReturn(res,200,{message: "Order Placed Success" , orderId: order.id })

            
        } catch (error) {
            console.log(error.message) 
        }
 
    }

    // End Method 
    
    get_customer_dashboard_data = async(req,res) => {
        const{ userId } = req.params 

        try {
            const recentOrders = await customerOrder.find({
                customerId: new ObjectId(userId) 
            }).limit(5)
            const pendingOrder = await customerOrder.find({
                customerId: new ObjectId(userId),delivery_status: 'pending'
             }).countDocuments()
             const totalOrder = await customerOrder.find({
                customerId: new ObjectId(userId)
             }).countDocuments()
             const cancelledOrder = await customerOrder.find({
                customerId: new ObjectId(userId),delivery_status: 'cancelled'
             }).countDocuments()
             responseReturn(res, 200,{
                recentOrders,
                pendingOrder,
                totalOrder,
                cancelledOrder
             })
            
        } catch (error) {
            console.log(error.message)
        } 

    }
     // End Method 

     get_orders = async (req, res) => {
        const {customerId, status} = req.params

        try {
            let orders = []
            if (status !== 'all') {
                orders = await customerOrder.find({
                    customerId: new ObjectId(customerId),
                    delivery_status: status
                })
            } else {
                orders = await customerOrder.find({
                    customerId: new ObjectId(customerId)
                })
            }
            responseReturn(res, 200,{
                orders
            })
            
        } catch (error) {
            console.log(error.message)
        }

     }
 // End Method 

 get_order_details = async (req, res) => {
    const {orderId} = req.params

    try {
        const order = await customerOrder.findById(orderId)
        responseReturn(res,200, {
            order
        })
        
    } catch (error) {
        console.log(error.message)
    }
 }
 // End Method 

 get_admin_orders = async(req, res) => {
    let {page,searchValue,parPage} = req.query
    page = parseInt(page)
    parPage= parseInt(parPage)

    const skipPage = parPage * (page - 1)

    try {
        if (searchValue) {
            
        } else {
            const orders = await customerOrder.aggregate([
                {
                    $lookup: {
                        from: 'authororders',
                        localField: "_id",
                        foreignField: 'orderId',
                        as: 'suborder'
                    }
                }
            ]).skip(skipPage).limit(parPage).sort({ createdAt: -1})

            const totalOrder = await customerOrder.aggregate([
                {
                    $lookup: {
                        from: 'authororders',
                        localField: "_id",
                        foreignField: 'orderId',
                        as: 'suborder'
                    }
                }
            ])

            responseReturn(res,200, { orders, totalOrder: totalOrder.length })
        }
    } catch (error) {
        console.log(error.message)
    } 

 }
  // End Method 
  
  get_admin_order = async (req, res) => {
    const { orderId } = req.params
    try {

        const order = await customerOrder.aggregate([
            {
                $match: {_id: new ObjectId(orderId)}
            },
            {
                $lookup: {
                    from: 'authororders',
                    localField: "_id",
                    foreignField: 'orderId',
                    as: 'suborder'
                }
            }
        ])
        responseReturn(res,200, { order: order[0] })
    } catch (error) {
        console.log('get admin order details' + error.message)
    }
  }
  // End Method 


  admin_order_status_update = async(req, res) => {
    const { orderId } = req.params
    const { status } = req.body

    try {
        await customerOrder.findByIdAndUpdate(orderId, {
            delivery_status : status
        })
        responseReturn(res,200, {message: 'order Status change success'})
    } catch (error) {
        console.log('get admin status error' + error.message)
        responseReturn(res,500, {message: 'internal server error'})
    }
     
  }
  // End Method 

  get_seller_orders = async (req,res) => {
        const {sellerId} = req.params
        let {page,searchValue,parPage} = req.query
        page = parseInt(page)
        parPage= parseInt(parPage)

        const skipPage = parPage * (page - 1)

        try {
            if (searchValue) {
                
            } else {
                const orders = await authOrderModel.find({
                    sellerId,
                }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
                const totalOrder = await authOrderModel.find({
                    sellerId
                }).countDocuments()
                responseReturn(res,200, {orders,totalOrder})
            }
            
        } catch (error) {
         console.log('get seller Order error' + error.message)
         responseReturn(res,500, {message: 'internal server error'})
        }
        
  }
  // End Method 

  get_seller_order = async (req,res) => {
    const { orderId } = req.params
    
    try {
        const order = await authOrderModel.findById(orderId)
        responseReturn(res, 200, { order })
    } catch (error) {
        console.log('get seller details error' + error.message)
    }
  }
  // End Method 

  seller_order_status_update = async(req,res) => {
    const {orderId} = req.params
    const { status } = req.body

    try {
        await authOrderModel.findByIdAndUpdate(orderId,{
            delivery_status: status
        })
        responseReturn(res,200, {message: 'order status updated successfully'})
    } catch (error) {
        console.log('get seller Order error' + error.message)
        responseReturn(res,500, {message: 'internal server error'})
    }


  }
  // End Method 

  // Create Paynow web payment
  create_paynow_payment = async (req, res) => {
    const { orderId, price, email } = req.body
    try {
        const order = await customerOrder.findById(orderId)
        if (!order) {
            return responseReturn(res, 404, { error: 'Order not found' })
        }

        // Create Paynow payment
        const payment = paynow.createPayment(`Order-${orderId}`, email)
        payment.add('Order Payment', price)

        const response = await paynow.send(payment)

        if (response.success) {
            // Store poll URL for checking status later
            await customerOrder.findByIdAndUpdate(orderId, {
                paynowPollUrl: response.pollUrl,
                paynowReference: response.instructions
            })

            responseReturn(res, 200, {
                success: true,
                redirectUrl: response.redirectUrl,
                pollUrl: response.pollUrl
            })
        } else {
            responseReturn(res, 400, {
                error: response.error || 'Payment creation failed'
            })
        }
    } catch (error) {
        console.log('Paynow error:', error.message)
        responseReturn(res, 500, { error: 'Payment processing failed' })
    }
  }
  // End Method

  // Create Paynow mobile payment (Ecocash/OneMoney)
  create_paynow_mobile_payment = async (req, res) => {
    const { orderId, price, email, phone, method } = req.body
    try {
        const order = await customerOrder.findById(orderId)
        if (!order) {
            return responseReturn(res, 404, { error: 'Order not found' })
        }

        // Create Paynow payment
        const payment = paynow.createPayment(`Order-${orderId}`, email)
        payment.add('Order Payment', price)

        // Send to mobile wallet
        const response = await paynow.sendMobile(payment, phone, method)

        if (response.success) {
            // Store poll URL
            await customerOrder.findByIdAndUpdate(orderId, {
                paynowPollUrl: response.pollUrl
            })

            responseReturn(res, 200, {
                success: true,
                instructions: response.instructions,
                pollUrl: response.pollUrl
            })
        } else {
            responseReturn(res, 400, {
                error: response.error || 'Mobile payment failed'
            })
        }
    } catch (error) {
        console.log('Paynow mobile error:', error.message)
        responseReturn(res, 500, { error: 'Mobile payment processing failed' })
    }
  }
  // End Method

  // Check Paynow payment status
  check_paynow_status = async (req, res) => {
    const { orderId } = req.params
    try {
        const order = await customerOrder.findById(orderId)
        if (!order || !order.paynowPollUrl) {
            return responseReturn(res, 404, { error: 'Order or payment not found' })
        }

        const status = await paynow.pollTransaction(order.paynowPollUrl)

        if (status.paid) {
            // Payment confirmed - process order
            await this.processPayment(orderId)
            responseReturn(res, 200, { paid: true, status: 'paid' })
        } else {
            responseReturn(res, 200, { paid: false, status: status.status })
        }
    } catch (error) {
        console.log('Status check error:', error.message)
        responseReturn(res, 500, { error: 'Status check failed' })
    }
  }
  // End Method

  // Paynow result URL callback
  paynow_result = async (req, res) => {
    try {
        const { reference, paynowreference, status } = req.body

        // Extract orderId from reference (format: Order-{orderId})
        const orderId = reference?.replace('Order-', '')

        if (orderId && (status === 'Paid' || status === 'paid')) {
            await this.processPayment(orderId)
        }

        res.status(200).send('OK')
    } catch (error) {
        console.log('Paynow result error:', error.message)
        res.status(500).send('Error')
    }
  }
  // End Method

  // Process payment - common method for confirming payment
  processPayment = async (orderId) => {
    try {
        await customerOrder.findByIdAndUpdate(orderId, { payment_status: 'paid' })
        await authOrderModel.updateMany({ orderId: new ObjectId(orderId) }, {
            payment_status: 'paid', delivery_status: 'pending'
        })

        const cuOrder = await customerOrder.findById(orderId)
        const auOrder = await authOrderModel.find({
            orderId: new ObjectId(orderId)
        })

        const time = moment(Date.now()).format('l')
        const splitTime = time.split('/')

        await myShopWallet.create({
            amount: cuOrder.price,
            month: splitTime[0],
            year: splitTime[2]
        })

        for (let i = 0; i < auOrder.length; i++) {
            await sellerWallet.create({
                sellerId: auOrder[i].sellerId.toString(),
                amount: auOrder[i].price,
                month: splitTime[0],
                year: splitTime[2]
            })
        }
        return true
    } catch (error) {
        console.log('Process payment error:', error.message)
        return false
    }
  }
  // End Method

  // Cash on Delivery - confirm order without payment
  confirm_cod_order = async (req, res) => {
    const { orderId } = req.params
    try {
        const order = await customerOrder.findById(orderId)
        if (!order) {
            return responseReturn(res, 404, { error: 'Order not found' })
        }

        // Mark as COD - unpaid but confirmed for delivery
        await customerOrder.findByIdAndUpdate(orderId, {
            payment_status: 'cod',
            delivery_status: 'pending'
        })
        await authOrderModel.updateMany({ orderId: new ObjectId(orderId) }, {
            payment_status: 'cod',
            delivery_status: 'pending'
        })

        responseReturn(res, 200, { message: 'Order confirmed for Cash on Delivery' })
    } catch (error) {
        console.log('COD error:', error.message)
        responseReturn(res, 500, { error: 'Failed to confirm COD order' })
    }
  }
  // End Method

  order_confirm = async (req, res) => {
    const { orderId } = req.params
    try {
        const success = await this.processPayment(orderId)
        if (success) {
            responseReturn(res, 200, { message: 'success' })
        } else {
            responseReturn(res, 500, { error: 'Failed to process payment' })
        }
    } catch (error) {
        console.log(error.message)
        responseReturn(res, 500, { error: 'Internal server error' })
    }
  }
  // End Method

}

module.exports = new orderController()