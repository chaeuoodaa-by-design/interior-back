const express = require('express');
const cors = require('cors');
const app = express();

// 라우트 파일 연결
const dynamodbRoutes = require('./routes/dynamodb');
const snsRoutes = require('./routes/sns');
const imageCrudRoutes = require('./routes/imageCrud');
const authRoutes = require('./routes/auth');

// 미들웨어 설정
app.use(express.json());

//CORS Setting
app.use(cors({origin: '*',}));


// 라우트 적용
app.use('/api/dynamodb', dynamodbRoutes);
app.use('/api/sns', snsRoutes);
app.use('/api/images', imageCrudRoutes); // 이미지 업로드 관련
app.use('/api/auth', authRoutes); // 이미지 업로드 관련

// 나머지 경로 처리
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
