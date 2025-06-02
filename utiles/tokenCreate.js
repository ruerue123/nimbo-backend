const jwt = require('jsonwebtoken');

exports.createToken = (data) => {
    return jwt.sign(data, process.env.SECRET, {
        expiresIn: '7d'
    });
};
