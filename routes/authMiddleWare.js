require('dotenv').config();

const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.AUTH_JWT_SECRET_KEY;  // JWT 비밀키

// 인증 미들웨어
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (err) {
        res.status(403).json({ message: 'Forbidden' });
    }
};

module.exports = authenticate;