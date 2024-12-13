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

module.exports = app;
