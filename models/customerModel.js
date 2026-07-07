const {Schema, model} = require("mongoose");

const customerSchema = new Schema({
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
        required : true,
        select: false
    },
    method: {
        type: String,
        required : true
    },
    // Email verification. New manual signups start unverified and must confirm
    // a 6-digit code before they can log in. OAuth ('menualy' aside) accounts
    // are trusted, so verified defaults appropriately at creation time.
    verified: {
        type: Boolean,
        default: false
    },
    emailVerificationCodeHash: {
        type: String,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        select: false
    },
    passwordResetTokenHash: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    }
},{ timestamps: true })

module.exports = model('customers',customerSchema)