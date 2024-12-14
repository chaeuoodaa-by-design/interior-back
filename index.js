const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app');

// Express 애플리케이션으로 AWS Lambda 서버 생성
const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
    // Lambda 요청을 Express로 전달
    awsServerlessExpress.proxy(server, event, context);
};

// 로컬 실행 시 Express 서버 시작
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
