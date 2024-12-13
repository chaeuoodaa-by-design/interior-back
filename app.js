const express = require('express');
const app = express();

app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello from Lambda!!!!' });
});
// 나머지 경로 처리
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
module.exports = app;
