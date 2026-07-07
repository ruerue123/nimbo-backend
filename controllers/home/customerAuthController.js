const customerModel = require('../../models/customerModel')
const { responseReturn } = require('../../utiles/response')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const sellerCustomerModel = require('../../models/chat/sellerCustomerModel')
const {createToken} = require('../../utiles/tokenCreate')
const { sendVerificationEmail } = require('../../utiles/emailService')

// Verification codes are 6 digits, stored as a SHA-256 hash (like reset
// tokens) so a DB leak can't be replayed, and expire after 15 minutes.
const CODE_TTL_MS = 15 * 60 * 1000
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex')
const generateCode = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0')

class customerAuthController{

    customer_register = async(req,res) => {
        const {name, email, password } = req.body

        try {
            const customer = await customerModel.findOne({email})
            if (customer) {
                return responseReturn(res, 409, { error : 'Email Already Exists' })
            }

            const code = generateCode()
            const createCustomer = await customerModel.create({
                name: name.trim(),
                email: email.trim(),
                password: await bcrypt.hash(password, 10),
                method: 'menualy',
                verified: false,
                emailVerificationCodeHash: hashCode(code),
                emailVerificationExpires: new Date(Date.now() + CODE_TTL_MS)
            })
            await sellerCustomerModel.create({
                myId: createCustomer.id
            })

            await sendVerificationEmail(createCustomer.email, code, createCustomer.name)

            // No auth cookie yet — the account is unverified. The storefront
            // routes the user to the verify screen using the returned email.
            responseReturn(res, 201, {
                message: 'Verification code sent. Check your email to finish signing up.',
                needsVerification: true,
                email: createCustomer.email
            })
        } catch (error) {
            console.log(error.message)
            responseReturn(res, 500, { error: 'Something went wrong. Please try again.' })
        }
    }
    // End Method

    // Confirms a signup code, marks the account verified, and logs the user in
    // by issuing the auth cookie — so verification and first login are one step.
    verify_email = async(req, res) => {
        const { email, code } = req.body
        try {
            const customer = await customerModel
                .findOne({ email })
                .select('+emailVerificationCodeHash +emailVerificationExpires')

            if (!customer) {
                return responseReturn(res, 404, { error: 'Account not found' })
            }
            if (customer.verified) {
                return responseReturn(res, 400, { error: 'Email is already verified. Please log in.' })
            }
            if (!customer.emailVerificationExpires || customer.emailVerificationExpires < new Date()) {
                return responseReturn(res, 400, { error: 'Code has expired. Request a new one.' })
            }
            if (customer.emailVerificationCodeHash !== hashCode(code)) {
                return responseReturn(res, 400, { error: 'Incorrect code. Please try again.' })
            }

            customer.verified = true
            customer.emailVerificationCodeHash = undefined
            customer.emailVerificationExpires = undefined
            await customer.save()

            const token = await createToken({
                id: customer.id,
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
            responseReturn(res, 200, {
                message: 'Email verified successfully.',
                userInfo: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    method: customer.method
                }
            })
        } catch (error) {
            console.log(error.message)
            responseReturn(res, 500, { error: 'Something went wrong. Please try again.' })
        }
    }
    // End Method

    // Reissues a fresh code for an unverified account. Generic 200 on unknown/
    // already-verified emails to avoid leaking which addresses have accounts.
    resend_verification = async(req, res) => {
        const { email } = req.body
        const genericOk = () => responseReturn(res, 200, {
            message: 'If your account needs verification, a new code has been sent.'
        })
        try {
            const customer = await customerModel.findOne({ email })
            if (!customer || customer.verified) {
                return genericOk()
            }
            const code = generateCode()
            customer.emailVerificationCodeHash = hashCode(code)
            customer.emailVerificationExpires = new Date(Date.now() + CODE_TTL_MS)
            await customer.save()
            await sendVerificationEmail(customer.email, code, customer.name)
            return genericOk()
        } catch (error) {
            console.log(error.message)
            return genericOk()
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
                // Block login until the email is verified. Pre-existing accounts
                // created before this feature have `verified` undefined — treat
                // only an explicit `false` as unverified so they aren't locked out.
                if (customer.verified === false) {
                    return responseReturn(res, 403, {
                        error: 'Please verify your email before signing in.',
                        needsVerification: true,
                        email: customer.email
                    })
                }
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