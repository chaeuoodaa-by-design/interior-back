/**
 * DB 없이
 * API 만 이후는 로직 처리
 * @type {e | (() => Express)}
 */

const express = require('express');
const AWS = require('aws-sdk');

const router = express.Router();

// AWS SNS 설정
AWS.config.update({ region: 'ap-southeast-1' });
const sns = new AWS.SNS();

// SNS 메시지 발송
router.post('/send-message', async (req, res) => {
    const { name, phoneNumber, content } = req.body;

    if (!name || !phoneNumber || !content) {
        return res.status(400).json({ error: 'name, phoneNumber, and content are required.' });
    }

    const message = `${name} 님께서 상담을 요청했습니다.\n` +
        `연락처: ${phoneNumber}\n` +
        `상담 내용:\n${content}`;

    const params = {
        TopicArn: 'arn:aws:sns:ap-southeast-1:480971819713:SnsSend',
        Message: message,
    };

    try {
        const response = await sns.publish(params).promise();
        res.status(200).json({
            message: 'Message sent successfully',
            messageId: response.MessageId,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

module.exports = router;
