const express = require('express');
const app = express();

/**
* Lambda Endpoint -> /api/{proxy+}
*
* */


app.get('/api/test', (req, res) => {
    res.json({ message: '무림맹별동대' });
});
// 나머지 경로 처리
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
module.exports = app;
