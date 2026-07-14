const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ===== S3 КЛИЕНТ =====
const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== КОНФИГУРАЦИЯ S3 =====
const s3Config = {
    endpoint: 'https://s3.twcstorage.ru',
    region: 'ru-1',
    credentials: {
        accessKeyId: 'WH5JV70A76ML0WY9VWJM',
        secretAccessKey: 'EtN37sHNRkLs5dPgJzkB2TQFUW8mSE81gDIFe8DP'
    },
    forcePathStyle: true
};

const s3Client = new S3Client(s3Config);
const BUCKET_NAME = 'deep-gaze-storage';

// ===== ЛОГИРОВАНИЕ ПОДКЛЮЧЕНИЯ К S3 =====
async function testS3Connection() {
    console.log('\n📦 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К S3...');
    console.log(`📍 Endpoint: ${s3Config.endpoint}`);
    console.log(`🔑 Access Key: ${s3Config.credentials.accessKeyId.substring(0, 8)}...`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    
    try {
        // Проверяем доступ к бакету
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: 1
        });
        
        const response = await s3Client.send(listCommand);
        console.log('✅ S3 ПОДКЛЮЧЕН УСПЕШНО!');
        console.log(`📁 Бакет "${BUCKET_NAME}" доступен`);
        console.log(`📄 Файлов в бакете: ${response.KeyCount || 0}`);
        console.log('📌 S3 готов к работе!\n');
        return true;
    } catch (error) {
        console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ К S3:');
        console.error(`  ├─ Код ошибки: ${error.Code || 'неизвестен'}`);
        console.error(`  ├─ Сообщение: ${error.message || 'неизвестно'}`);
        console.error(`  └─ Статус: ${error.$metadata?.httpStatusCode || 'неизвестен'}`);
        
        if (error.Code === 'NoSuchBucket') {
            console.log('\n⚠️ Бакет не найден. Попытка создать...');
            try {
                const createCommand = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: 'test.txt',
                    Body: 'S3 connection test'
                });
                await s3Client.send(createCommand);
                console.log(`✅ Бакет "${BUCKET_NAME}" создан успешно!`);
                return true;
            } catch (createError) {
                console.error('❌ Не удалось создать бакет:', createError.message);
                return false;
            }
        }
        return false;
    }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С S3 =====
async function uploadToS3(key, body, contentType = 'application/octet-stream') {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType
        });
        const response = await s3Client.send(command);
        console.log(`📤 Загружено в S3: ${key}`);
        return response;
    } catch (error) {
        console.error(`❌ Ошибка загрузки в S3 (${key}):`, error.message);
        throw error;
    }
}

async function getFromS3(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        const response = await s3Client.send(command);
        console.log(`📥 Загружено из S3: ${key}`);
        return response;
    } catch (error) {
        console.error(`❌ Ошибка получения из S3 (${key}):`, error.message);
        throw error;
    }
}

async function deleteFromS3(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        const response = await s3Client.send(command);
        console.log(`🗑️ Удалено из S3: ${key}`);
        return response;
    } catch (error) {
        console.error(`❌ Ошибка удаления из S3 (${key}):`, error.message);
        throw error;
    }
}

async function listS3Files(prefix = '') {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix
        });
        const response = await s3Client.send(command);
        console.log(`📋 Список файлов в S3 (${prefix || 'корень'}):`, response.Contents?.length || 0);
        return response.Contents || [];
    } catch (error) {
        console.error(`❌ Ошибка получения списка из S3:`, error.message);
        throw error;
    }
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
module.exports = {
    s3Client,
    BUCKET_NAME,
    uploadToS3,
    getFromS3,
    deleteFromS3,
    listS3Files,
    testS3Connection
};

// ===== НАСТРОЙКА EXPRESS =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 7 * 24 * 60 * 60,
        retries: 0
    }),
    secret: 'deep-gaze-super-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.use((req, res, next) => {
    const sessionId = req.session ? req.session.id : 'НЕТ СЕССИИ';
    const userId = req.session?.user?.login || 'НЕТ ПОЛЬЗОВАТЕЛЯ';
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    console.log(`  ├─ Session ID: ${sessionId}`);
    console.log(`  └─ User: ${userId}`);
    next();
});

// ===== ТЕСТОВЫЙ МАРШРУТ ДЛЯ ПРОВЕРКИ S3 =====
app.get('/api/s3-test', async (req, res) => {
    try {
        const files = await listS3Files();
        res.json({
            success: true,
            connected: true,
            bucket: BUCKET_NAME,
            filesCount: files.length,
            files: files.slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== МАРШРУТЫ =====
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

// ===== ЗАПУСК =====
async function startServer() {
    // Проверяем подключение к S3
    const s3Connected = await testS3Connection();
    
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        console.log(`📁 S3 статус: ${s3Connected ? '✅ ПОДКЛЮЧЕН' : '❌ НЕ ПОДКЛЮЧЕН'}`);
        console.log(`📌 Войдите под admin / admin123`);
        console.log(`📌 Проверка S3: GET /api/s3-test\n`);
    });
}

startServer();
