const express = require('express');

const Busboy = require('busboy');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = express.Router();

// AWS SDK 설정
const s3Client = new S3Client({ region: 'ap-northeast-2' });
const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-2' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = 'chaeuda-portfolio';
const TABLE_NAME = 'cwd-portfolio';

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
            metadata = JSON.   parse(value);
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

// 이미지 여러 개 저장
router.post('/upload-multiple', async (req, res) => {
    const busboy =  Busboy({ headers: req.headers });
    let imageGroup = null;
    let metadata = null;
    const images = [];

    // 폼 데이터 처리
    busboy.on('field', (fieldname, value) => {
        if (fieldname === 'image_group') {
            imageGroup = value;
        } else if (fieldname === 'metadata') {
            metadata = JSON.parse(value);
        }
    });

    // 파일 데이터 처리
    busboy.on('file', (fieldname, file, filename) => {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
            images.push({ filename, buffer: Buffer.concat(chunks) });
        });
    });

    // 데이터 처리 완료 시 실행
    busboy.on('finish', async () => {
        try {
            if (!imageGroup || images.length === 0) {
                return res.status(400).json({ message: 'image_group 또는 파일이 누락되었습니다.' });
            }

            // 현재 그룹의 최대 order 값 조회
            const queryParams = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'image_group = :image_group',
                ExpressionAttributeValues: {
                    ':image_group': imageGroup,
                },
            };

            const result = await dynamodb.send(new QueryCommand(queryParams));
            const currentItems = result.Items || [];
            const maxOrder = currentItems.length > 0
                ? Math.max(...currentItems.map(item => item.order || 999))
                : 0;

            const savedImages = [];
            const uploadPromises = [];

            for (let i = 0; i < images.length; i++) {
                const { filename, buffer } = images[i];
                const newOrder = maxOrder + i + 1; // 현재 최대 order 뒤에 추가
                const imageId = `${imageGroup}-${newOrder}`;
                const s3Key = `uploads/${imageGroup}/${imageId}-${filename}`;

                // S3 업로드
                const s3Promise = s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                    Body: buffer,
                    ContentType: "image/jpeg",
                }));

                // DynamoDB 저장
                const dbPromise = dynamodb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        image_group: imageGroup,
                        image_id: imageId,
                        s3_url: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
                        metadata: metadata || {},
                        is_title: i === 0, // 첫 번째 이미지를 대표 이미지로 설정
                        order: newOrder,
                    },
                }));

                uploadPromises.push(s3Promise, dbPromise);

                savedImages.push({
                    image_id: imageId,
                    s3_url: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
                    order: newOrder,
                });
            }

            // 모든 업로드와 저장 작업 완료 대기
            await Promise.all(uploadPromises);

            res.status(201).json({
                message: '이미지가 성공적으로 업로드되었습니다.',
                savedImages,
            });
        } catch (error) {
            res.status(500).json({
                message: '업로드 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    });

    req.pipe(busboy);
});
// 대표 이미지 가져오기
router.get('/image-group/:image_group/title', async (req, res) => {
    const { image_group } = req.params;

    try {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'image_group = :image_group',
            FilterExpression: 'is_title = :is_title',
            ExpressionAttributeValues: {
                ':image_group': image_group,
                ':is_title': true,
            },
        };

        const result = await dynamodb.send(new QueryCommand(params));

        if (result.Items.length === 0) {
            return res.status(404).json({ message: '대표 이미지를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            message: '대표 이미지 조회 성공',
            titleImage: result.Items[0],
        });
    } catch (error) {
        res.status(500).json({
            message: '대표 이미지를 조회하는 중 오류가 발생했습니다.',
            error: error.message,
        });
    }
});




// 파티션 키에 해당하는 모든 이미지
router.get('/image-group/:image_group/images', async (req, res) => {
    const { image_group } = req.params;

    try {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'image_group = :image_group', // 파티션 키 조건
            ExpressionAttributeValues: {
                ':image_group': image_group,
            },
        };

        const result = await dynamodb.send(new QueryCommand(params)); // QueryCommand 사용

        if (!result.Items || result.Items.length === 0) {
            return res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });
        }

        // 각 이미지의 URL만 추출
        const imageUrls = result.Items.map(item => item.s3_url);

        res.status(200).json({
            message: '이미지 리스트 조회 성공',
            imageUrls,
        });
    } catch (error) {
        res.status(500).json({
            message: '이미지 리스트를 조회하는 중 오류가 발생했습니다.',
            error: error.message,
        });
    }
});


router.post('/image-group/:image_group/manage', async (req, res) => {
    const { image_group } = req.params;
    const busboy = new Busboy({ headers: req.headers });

    const deletedImages = [];
    const updatedImages = [];
    const newImages = [];
    const replaceMapping = {}; // 기존 이미지와 대체할 새 이미지 매핑

    busboy.on('field', (fieldname, value) => {
        if (fieldname === 'deleted_images') {
            deletedImages.push(...JSON.parse(value));
        } else if (fieldname === 'updated_images') {
            updatedImages.push(...JSON.parse(value));
        }
    });

    busboy.on('file', (fieldname, file, filename) => {
        const chunks = [];
        file.on('data', chunk => chunks.push(chunk));
        file.on('end', () => {
            newImages.push({
                filename,
                buffer: Buffer.concat(chunks),
            });
        });
    });

    busboy.on('finish', async () => {
        try {
            // 1. 현재 이미지 목록 조회
            const queryParams = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'image_group = :image_group',
                ExpressionAttributeValues: {
                    ':image_group': image_group,
                },
            };

            const result = await dynamodb.send(new QueryCommand(queryParams));
            const currentItems = result.Items || [];

            // 2. 삭제 작업
            for (const imageId of deletedImages) {
                const s3Key = currentItems.find(item => item.image_id === imageId)?.s3_url.split('.amazonaws.com/')[1];
                if (s3Key) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: s3Key,
                    }));
                }
                await dynamodb.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { image_group, image_id: imageId },
                }));
            }

            // 3. 수정 작업
            for (const image of updatedImages) {
                const dbParams = {
                    TableName: TABLE_NAME,
                    Key: { image_group, image_id: image.image_id },
                    UpdateExpression: "SET is_title = :is_title, #order = :order",
                    ExpressionAttributeValues: {
                        ":is_title": image.is_title,
                        ":order": image.order,
                    },
                    ExpressionAttributeNames: {
                        "#order": "order",
                    },
                };
                await dynamodb.send(new PutCommand(dbParams));
            }

            // 4. 새로운 이미지 추가
            const maxOrder = currentItems.length > 0
                ? Math.max(...currentItems.map(item => item.order || 0))
                : 0;

            for (let i = 0; i < newImages.length; i++) {
                const { filename, buffer } = newImages[i];
                const newOrder = maxOrder + i + 1; // 현재 최대 order 뒤에 추가
                const newImageId = `${image_group}-${newOrder}`;
                const s3Key = `uploads/${image_group}/${newImageId}-${filename}`;

                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                    Body: buffer,
                    ContentType: "image/jpeg",
                }));

                await dynamodb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        image_group,
                        image_id: newImageId,
                        s3_url: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
                        is_title: false,
                        order: newOrder,
                    },
                }));
            }

            // 5. 정렬 후 순서 재할당
            const allImages = [...currentItems.filter(item => !deletedImages.includes(item.image_id)), ...updatedImages];
            allImages.sort((a, b) => a.order - b.order);

            for (let i = 0; i < allImages.length; i++) {
                const item = allImages[i];
                await dynamodb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        ...item,
                        order: i + 1, // 순서를 재조정
                    },
                }));
            }

            res.status(200).json({
                message: "이미지 그룹이 성공적으로 업데이트되었습니다.",
            });
        } catch (error) {
            res.status(500).json({
                message: "이미지 그룹을 관리하는 중 오류가 발생했습니다.",
                error: error.message,
            });
        }
    });

    req.pipe(busboy);
});








module.exports = router;
