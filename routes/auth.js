require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const fs = require('fs');

// 환경 변수에서 인증 정보 가져오기
const ID = process.env.AUTH_IDENTIFICATION;
const PW = process.env.AUTH_PASSWORD;
const SECRET_KEY = process.env.AUTH_JWT_SECRET_KEY;  // JWT 비밀키
const privateKey = process.env.RSA_PRIVATE_KEY;
const publicKey = process.env.RSA_PUBLIC_KEY;

// 로그인 엔드포인트
router.post('/login', (req, res) => {
    const { id, pw } = req.body;

    // 간단한 사용자 인증 로직 (DB 없이 하드코딩된 사용자 정보 확인)
    if (id === ID && pw === PW) {
        const token = jwt.sign({ id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

router.get('/auth-check', (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json({message: 'Unauthorized'});

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        res.json({message: 'ok'});
        // next();
    } catch (err) {
        res.json({message: 'Forbidden'});
    }
});

router.get('/pub-key/r', (req, res) => {
    console.log("publuc : ", publicKey);

    try {
        res.json({ publicKey });
    } catch (e) {
        res.status(401).json({ message: e });
    }

});


module.exports = router;