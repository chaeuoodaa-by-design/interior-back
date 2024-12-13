const express = require('express');
const app = express();

// 미들웨어 설정
app.use(express.json());

// 라우트 설정
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Lambda!' });
});

app.get('/users', (req, res) => {
    res.json({ users: [{ id: 1, name: 'Tester' }] });
});

// 나머지 경로 처리
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
