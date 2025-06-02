const adminModel = require('../models/adminModel')
const sellerModel = require('../models/sellerModel')
const sellerCustomerModel  = require('../models/chat/sellerCustomerModel')
const { responseReturn } = require('../utiles/response')
const bcrypt = require('bcrypt');
const { createToken } = require('../utiles/tokenCreate')
const cloudinary = require('cloudinary').v2
const formidable = require("formidable")
const {compare} = require("bcrypt");

class authControllers{

    admin_login = async (req, res) => {
        const { email, password } = req.body;

        try {
            const admin = await adminModel.findOne({ email }).select('+password');

            if (!admin) {
                return responseReturn(res, 404, { error: "Email not found" });
            }

            const match = await bcrypt.compare(password, admin.password); // You had a typo: "bcrpty"

            if (!match) {
                return responseReturn(res, 401, { error: "Incorrect password" });
            }

            const token = await createToken({
                id: admin.id,
                role: admin.role
            });

            // Secure cookie setup (important for cross-origin)
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: true,            // required for SameSite=None on HTTPS
                sameSite: 'None',        // allows cross-origin requests
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            console.log("LOGIN TOKEN:", token);

            return responseReturn(res, 200, {
                token,
                message: "Login Success"
            });

        } catch (error) {
            console.error("Login error:", error.message);
            return responseReturn(res, 500, { error: "Internal Server Error" });
        }
    }

    // End Method 


    seller_login = async (req, res) => {
        const { email, password } = req.body;

        try {
            const seller = await sellerModel.findOne({ email }).select('+password');

            if (!seller) {
                return responseReturn(res, 404, { error: 'Email not found' });
            }

            const match = await compare(password, seller.password);

            if (!match) {
                return responseReturn(res, 401, { error: 'Incorrect password' });
            }

            const token = createToken({
                id: seller.id,
                role: seller.role
            });

            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });


            console.log('TOKEN:', token);
            responseReturn(res, 200, { token, message: 'Login success' });
        } catch (error) {
            responseReturn(res, 500, { error: error.message });
        }
    };
    // End Method 


    seller_register = async (req, res) => {
        const { email, name, password } = req.body;

        try {
            const existingUser = await sellerModel.findOne({ email });

            if (existingUser) {
                return responseReturn(res, 409, { error: 'Email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const seller = await sellerModel.create({
                name,
                email,
                password: hashedPassword,
                method: 'manually',
                shopInfo: {}
            });

            await sellerCustomerModel.create({ myId: seller.id });

            const token = await createToken({ id: seller.id, role: seller.role });

            // Secure cookie setup
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: true,           // Required for SameSite=None over HTTPS
                sameSite: 'None',       // Enables cross-origin requests
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return responseReturn(res, 201, {
                token,
                message: 'Register Success'
            });

        } catch (error) {
            console.error("Registration Error:", error.message);
            return responseReturn(res, 500, { error: 'Internal Server Error' });
        }
    };
    // End Method 







    getUser = async (req, res) => {
        const { id, role } = req;

        try {
            let userInfo;

            if (role === 'admin') {
                userInfo = await adminModel.findById(id).select('-password'); // Never return password
            } else if (role === 'seller') {
                userInfo = await sellerModel.findById(id).select('-password');
            } else {
                return responseReturn(res, 403, { error: 'Unauthorized role' });
            }

            if (!userInfo) {
                return responseReturn(res, 404, { error: 'User not found' });
            }

            return responseReturn(res, 200, { userInfo });

        } catch (error) {
            console.error("getUser error:", error.message);
            return responseReturn(res, 500, { error: 'Internal Server Error' });
        }
    };
    // End getUser Method

    profile_image_upload = async(req, res) => {
        const {id} = req
        const form = formidable({ multiples: true })
        form.parse(req, async(err,_,files) => {
                cloudinary.config({
                cloud_name: process.env.cloud_name,
                api_key: process.env.api_key,
                api_secret: process.env.api_secret,
                secure: true
            })
            const { image } = files

            try {
                const result = await cloudinary.uploader.upload(image.filepath, { folder: 'profile'})
                if (result) {
                    await sellerModel.findByIdAndUpdate(id, {
                        image: result.url
                    }) 
                    const userInfo = await sellerModel.findById(id)
                    responseReturn(res, 201,{ message : 'Profile Image Upload Successfully',userInfo})
                } else {
                    responseReturn(res, 404,{ error : 'Image Upload Failed'})
                }
                
            } catch (error) {
                responseReturn(res, 500,{ error : error.message })
            }
 

        })
    }

    // End Method 

    profile_info_add = async (req, res) => {
       const { division,district,shopName,sub_district } = req.body;
       const {id} = req;

       try {
        await sellerModel.findByIdAndUpdate(id, {
            shopInfo: {
                shopName,
                division,
                district,
                sub_district
            }
        })
        const userInfo = await sellerModel.findById(id)
        responseReturn(res, 201,{ message : 'Profile info Add Successfully',userInfo})
        
       } catch (error) {
        responseReturn(res, 500,{ error : error.message })
       }


    }
// End Method 

    logout = async (req, res) => {
        try {
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
                sameSite: 'strict' // Prevent CSRF in cross-site contexts
            });

            responseReturn(res, 200, { message: 'Logout success' });
        } catch (error) {
            console.error('Logout error:', error.message);
            responseReturn(res, 500, { error: 'Logout failed' });
        }
    };

// End Method 

/// Change Password 
change_password = async (req,res) => {
    const {email, old_password, new_password} = req.body;
   // console.log(email,old_password,new_password)
   try {
    const user = await sellerModel.findOne({email}).select('+password');
    if (!user) return res.status(404).json({message: 'User not found'});

    const isMatch = await bcrpty.compare(old_password, user.password);
    if(!isMatch) return res.status(400).json({message: 'Incorrect old password'});

    user.password = await bcrpty.hash(new_password, 10);
    await user.save();
    res.json({ message: 'Password changed successfully'});

   } catch (error) {
    res.status(500).json({message: 'Server Error'});
   } 
}
// End Method 



}

module.exports = new authControllers()