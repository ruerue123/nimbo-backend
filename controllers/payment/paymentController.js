const sellerWallet = require('../../models/sellerWallet')
const withdrowRequest = require('../../models/withdrowRequest')
const { responseReturn } = require('../../utiles/response')

class paymentController {

    sumAmount = (data) => {
        let sum = 0
        for (let i = 0; i < data.length; i++) {
            sum = sum + data[i].amount
        }
        return sum
    }

    get_seller_payment_details = async (req, res) => {
        const { sellerId } = req.params

        try {
            const payments = await sellerWallet.find({ sellerId })

            const pendingWithdrows = await withdrowRequest.find({
                $and: [
                    { sellerId: { $eq: sellerId } },
                    { status: { $eq: 'pending' } }
                ]
            })

            const successWithdrows = await withdrowRequest.find({
                $and: [
                    { sellerId: { $eq: sellerId } },
                    { status: { $eq: 'success' } }
                ]
            })

            const pendingAmount = this.sumAmount(pendingWithdrows)
            const withdrowAmount = this.sumAmount(successWithdrows)
            const totalAmount = this.sumAmount(payments)

            let availableAmount = 0
            if (totalAmount > 0) {
                availableAmount = totalAmount - (pendingAmount + withdrowAmount)
            }

            responseReturn(res, 200, {
                totalAmount,
                pendingAmount,
                withdrowAmount,
                availableAmount,
                pendingWithdrows,
                successWithdrows
            })
        } catch (error) {
            console.error('get_seller_payment_details error:', error.message)
            responseReturn(res, 500, { message: 'Internal Server Error' })
        }
    }

    withdrowal_request = async (req, res) => {
        const { amount, sellerId } = req.body

        try {
            const withdrowal = await withdrowRequest.create({
                sellerId,
                amount: parseInt(amount)
            })
            responseReturn(res, 200, { withdrowal, message: 'Withdrowal Request Send' })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal Server Error' })
        }
    }

    get_payment_request = async (req, res) => {
        try {
            const withdrowalRequest = await withdrowRequest.find({ status: 'pending' })
            responseReturn(res, 200, { withdrowalRequest })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal Server Error' })
        }
    }

    // Admin manually confirms the payout after paying the seller off-platform (bank/mobile money).
    // TODO: once a seller payout provider is wired in, trigger the actual transfer here instead of just marking success.
    payment_request_confirm = async (req, res) => {
        const { paymentId } = req.body
        try {
            const payment = await withdrowRequest.findById(paymentId)
            if (!payment) {
                return responseReturn(res, 404, { message: 'Payment request not found' })
            }
            if (payment.status !== 'pending') {
                return responseReturn(res, 400, { message: 'Payment request is not pending' })
            }

            await withdrowRequest.findByIdAndUpdate(paymentId, { status: 'success' })
            responseReturn(res, 200, { payment, message: 'Request Confirm Success' })
        } catch (error) {
            console.error('payment_request_confirm error:', error.message)
            responseReturn(res, 500, { message: 'Internal Server Error' })
        }
    }

}


module.exports = new paymentController()
