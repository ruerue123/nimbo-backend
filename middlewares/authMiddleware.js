const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
    const { accessToken } = req.cookies;

    if (!accessToken) {
        return res.status(401).json({ error: 'Please login first' });
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.SECRET);
        req.role = decoded.role;
        req.id = decoded.id;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
