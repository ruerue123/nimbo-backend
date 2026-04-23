const customerModel = require('../../models/customerModel')
const { responseReturn } = require('../../utiles/response')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const sellerCustomerModel = require('../../models/chat/sellerCustomerModel')
const {createToken} = require('../../utiles/tokenCreate')

class customerAuthController{

    customer_register = async(req,res) => {
        const {name, email, password } = req.body

        try {
            const customer = await customerModel.findOne({email}) 
            if (customer) {
                responseReturn(res, 404,{ error : 'Email Already Exits'} )
            } else {
                const createCustomer = await customerModel.create({
                    name: name.trim(),
                    email: email.trim(),
                    password: await bcrypt.hash(password, 10),
                    method: 'menualy'
                })
                await sellerCustomerModel.create({
                    myId: createCustomer.id
                })
                const token = await createToken({
                    id : createCustomer.id,
                    name: createCustomer.name,
                    email: createCustomer.email,
                    method: createCustomer.method 
                })
                res.cookie('customerToken', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                })
                responseReturn(res, 201, {
                    message: "User Register Success",
                    userInfo: {
                        id: createCustomer.id,
                        name: createCustomer.name,
                        email: createCustomer.email,
                        method: createCustomer.method
                    }
                })
            }
        } catch (error) {
            console.log(error.message)
        }
    }
    // End Method

    customer_login = async(req, res) => {
       const { email, password } =req.body
       try {
        const customer = await customerModel.findOne({email}).select('+password')
        if (customer) {
            const match = await bcrypt.compare(password, customer.password)
            if (match) {
                const token = await createToken({
                    id : customer.id,
                    name: customer.name,
                    email: customer.email,
                    method: customer.method 
                })
                res.cookie('customerToken', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                })
                responseReturn(res, 201, {
                    message: 'User Login Success',
                    userInfo: {
                        id: customer.id,
                        name: customer.name,
                        email: customer.email,
                        method: customer.method
                    }
                })
                
            } else {
                responseReturn(res, 404,{ error :  'Password Wrong'})
            }
        } else {
            responseReturn(res, 404,{ error :  'Email Not Found'})
        }
        
       } catch (error) {
        console.log(error.message)
       }
    }
  // End Method

  customer_logout = async(req, res) => {
    res.clearCookie('customerToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    })
    responseReturn(res, 200, { message: 'Logout Success' })
  }
    // End Method

  // Returns the logged-in customer from the HttpOnly customerToken cookie.
  // The storefront calls this on mount instead of reading the token from JS
  // (which it can't anymore — the cookie is HttpOnly).
  customer_me = async (req, res) => {
    const { customerToken } = req.cookies || {}
    if (!customerToken) {
        return responseReturn(res, 401, { error: 'Not authenticated' })
    }
    try {
        const decoded = jwt.verify(customerToken, process.env.SECRET)
        return responseReturn(res, 200, {
            userInfo: {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email,
                method: decoded.method
            }
        })
    } catch (err) {
        return responseReturn(res, 401, { error: 'Invalid or expired session' })
    }
  }

}

module.exports = new customerAuthController()