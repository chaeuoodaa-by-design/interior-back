const express = require('express');
const app = express();

app.use(express.json()); // JSON 파싱 미들웨어

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand  } = require('@aws-sdk/lib-dynamodb');


//로컬에서 테스트 할 때
/**
* npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 * aws cli install
 * 설치 경로
 * https://docs.aws.amazon.com/ko_kr/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions
 *
 *
* aws configure
 *
 *
 * export AWS_ACCESS_KEY_ID=your-access-key-id
 * export AWS_SECRET_ACCESS_KEY=your-secret-access-key
 * export AWS_REGION=your-region (서울리전 -> ap-northeast-2)
 *
* */

// DynamoDB 클라이언트 생성
const dynamoClient = new DynamoDBClient({
    region: 'ap-northeast-2', // 리전 설정
});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = 'portfolio';



/**
* Lambda Endpoint -> /api/{proxy+}
*
* */


app.get('/api/test', (req, res) => {
    res.json({ message: '무림맹별동대' });
});

// Create
app.post('/api/create', async (req, res) => {
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
app.get('/api/read/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name, // 파티션 키
            image_no: Number(req.params.image_no), // 정렬 키 (숫자 타입으로 변환)
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
app.get('/api/items', async (req, res) => {
    const params = {
        TableName: TABLE_NAME, // 스캔할 테이블 이름
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
app.put('/api/update/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name, // 파티션 키
            image_no: Number(req.params.image_no), // 정렬 키 (숫자 타입)
        },
        UpdateExpression: 'set #name = :name',
        ExpressionAttributeNames: { '#name': 'name' }, // 속성 이름 매핑
        ExpressionAttributeValues: { ':name': req.body.name }, // 업데이트할 값
        ReturnValues: 'UPDATED_NEW', // 업데이트된 항목 반환
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
app.delete('/api/delete/:image_name/:image_no', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            image_name: req.params.image_name, // 파티션 키
            image_no: Number(req.params.image_no), // 정렬 키 (숫자 타입)
        },
    };

    try {
        await dynamodb.send(new DeleteCommand(params));
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// 나머지 경로 처리
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});


module.exports = app;
