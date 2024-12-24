const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Busboy = require('busboy');

const router = express.Router();

// DynamoDB 설정
const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-2' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = 'portfolio';

// S3 설정
const s3Client = new S3Client({ region: "ap-northeast-2" });
const BUCKET_NAME = 'chaeuda-portfolio';


// 테스트 엔드포인트
router.get('/test', (req, res) => {
    res.json({ message: '무림맹별동대' });
});

// Create
router.post('/create', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Item: req.body,
    };

    try {
        await dynamodb.send(new PutCommand(params));
        res.status(201).json({ message: 'Item created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read
router.get('/read/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name,
            image_no: Number(req.params.image_no),
        },
    };

    try {
        const result = await dynamodb.send(new GetCommand(params));
        if (!result.Item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.Item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read All
router.get('/items', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
    };

    try {
        const result = await dynamodb.send(new ScanCommand(params));
        if (!result.Items || result.Items.length === 0) {
            return res.status(404).json({ message: 'No items found' });
        }
        res.json(result.Items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update
router.put('/update/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name,
            image_no: Number(req.params.image_no),
        },
        UpdateExpression: 'set #name = :name',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': req.body.name },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const result = await dynamodb.send(new UpdateCommand(params));
        if (!result.Attributes) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.Attributes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete
router.delete('/delete/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name,
            image_no: Number(req.params.image_no),
        },
    };

    try {
        await dynamodb.send(new DeleteCommand(params));
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
