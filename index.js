const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app'); // Express 앱을 불러옵니다.

exports.handler = serverlessExpress({ app });
