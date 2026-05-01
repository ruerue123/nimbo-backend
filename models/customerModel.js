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