const express = require('express');

const Busboy = require('busboy');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const router = express.Router();

// AWS SDK 설정
const s3Client = new S3Client({ region: 'ap-northeast-2' });
const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-2' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = 'chaeuda-portfolio';
const TABLE_NAME = 'portfolio';

// 이미지 업로드 및 DynamoDB 저장
router.post('/upload', async (req, res) => {
    const busboy = Busboy({ headers: req.headers });
    let imageName = null;
    let metadata = null;
    let fileBuffer = null;

    // 폼 데이터 처리
    busboy.on('field', (fieldname, value) => {
        if (fieldname === 'image_name') {
            imageName = value;
        } else if (fieldname === 'metadata') {
            metadata = JSON.parse(value);
        }
    });

    // 파일 데이터 처리
    busboy.on('file', (fieldname, file) => {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
        });
    });

    // 데이터 처리 완료 시 실행
    busboy.on('finish', async () => {
        try {
            if (!imageName || !fileBuffer) {
                return res.status(400).json({ message: 'image_name 또는 파일이 누락되었습니다.' });
            }

            const imageNo = Date.now(); // 타임스탬프 기반 ID
            const s3Key = `uploads/${imageNo}-${imageName}`;

            // S3 업로드
            const uploadParams = {
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: 'image/jpeg',
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

            // DynamoDB 저장
            const dbParams = {
                TableName: TABLE_NAME,
                Item: {
                    image_name: imageName,
                    image_no: imageNo,
                    s3_url: s3Url,
                    metadata: metadata || {},
                },
            };
            await dynamodb.send(new PutCommand(dbParams));

            res.status(201).json({
                message: '이미지가 성공적으로 업로드되고 데이터가 저장되었습니다.',
                image_name: imageName,
                image_no: imageNo,
                s3_url: s3Url,
            });
        } catch (error) {
            res.status(500).json({
                message: '업로드 또는 데이터 저장 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    });

    req.pipe(busboy); // 요청 데이터를 Busboy로 전달
});

module.exports = router;