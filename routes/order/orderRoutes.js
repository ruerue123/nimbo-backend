const orderController = require('../../controllers/order/orderController')
const { validate } = require('../../middlewares/validate')
const {
    placeOrderSchema,
    paynowCreateSchema,
    paynowMobileSchema
} = require('../../schemas/orderSchemas')
const router = require('express').Router()

// Customer
router.post('/home/order/place-order', validate(placeOrderSchema), orderController.place_order)
router.get('/home/coustomer/get-dashboard-data/:userId', orderController.get_customer_dashboard_data)
router.get('/home/coustomer/get-orders/:customerId/:status', orderController.get_orders)
router.get('/home/coustomer/get-order-details/:orderId', orderController.get_order_details)

// Paynow Payment Routes
router.post('/order/paynow/create', validate(paynowCreateSchema), orderController.create_paynow_payment)
router.post('/order/paynow/mobile', validate(paynowMobileSchema), orderController.create_paynow_mobile_payment)
router.get('/order/paynow/status/:orderId', orderController.check_paynow_status)
// paynow_result is a server-to-server webhook posted by Paynow; schema not
// applied because the payload shape is theirs, not ours.
router.post('/order/paynow/result', orderController.paynow_result)

// COD Route
router.post('/order/cod/confirm/:orderId', orderController.confirm_cod_order)

// Legacy confirm route
router.get('/order/confirm/:orderId',orderController.order_confirm)

// One-time wallet backfill (token-guarded, dry-run by default). Remove after use.
router.get('/admin/backfill-wallets', orderController.backfill_wallets)

// Admin
router.get('/admin/orders',orderController.get_admin_orders)
router.get('/admin/order/:orderId',orderController.get_admin_order)
router.put('/admin/order-status/update/:orderId',orderController.admin_order_status_update)

// Seller
router.get('/seller/orders/:sellerId',orderController.get_seller_orders)
router.get('/seller/order/:orderId',orderController.get_seller_order)
router.put('/seller/order-status/update/:orderId',orderController.seller_order_status_update)
router.put('/seller/order-delivery-details/:orderId',orderController.update_delivery_details)

module.exports = router  