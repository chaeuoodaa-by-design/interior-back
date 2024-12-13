const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app');

// Express 애플리케이션으로 AWS Lambda 서버 생성
const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
    // Lambda 요청을 Express로 전달
    awsServerlessExpress.proxy(server, event, context);
};
