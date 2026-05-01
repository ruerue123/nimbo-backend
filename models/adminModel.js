const {Schema, model} = require("mongoose");

const adminSchema = new Schema({
    name: {
        type: String,
        required : true
    },
    email: {
        type: String,
        required : true
    },
    password: {
        type: String,
        required : true
    },
    image: {
        type: String,
        required : true
    },
    role: {
        type: String,
        default : 'admin'
    },
    passwordResetTokenHash: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    }
})

module.exports = model('admins',adminSchema)