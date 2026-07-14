const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ===== ПОДКЛЮЧЕНИЕ S3 =====
const { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

const BUCKET_NAME = 'b84d36c2-5e58-406e-9d3d-5754fe0dda39';

// Создаем S3 клиент
const s3Client = new S3Client(s3Config);
let s3Connected = false;

// ===== ФУНКЦИЯ ПРОВЕРКИ S3 =====
async function testS3Connection() {
    console.log('🔍 Проверка подключения к S3...');
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log('✅ S3 подключен успешно!');
        s3Connected = true;
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к S3:');
        console.error('  ├─ Name:', error.name);
        console.error('  ├─ Code:', error.Code || 'Нет');
        console.error('  └─ Message:', error.message);
        s3Connected = false;
        return false;
    }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С S3 =====
async function uploadToS3(key, data, contentType = 'application/json') {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен, пропускаем загрузку: ${key}`);
        return false;
    }
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            ContentType: contentType
        };
        await s3Client.send(new PutObjectCommand(params));
        console.log(`✅ Файл загружен в S3: ${key}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка загрузки в S3: ${error.message}`);
        return false;
    }
}

async function downloadFromS3(key) {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен, пропускаем скачивание: ${key}`);
        return null;
    }
    try {
        const params = { Bucket: BUCKET_NAME, Key: key };
        const result = await s3Client.send(new GetObjectCommand(params));
        const body = await result.Body.transformToString();
        console.log(`✅ Файл скачан из S3: ${key}`);
        return body;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`⚠️ Файл не найден в S3: ${key}`);
            return null;
        }
        console.error(`❌ Ошибка скачивания из S3: ${error.message}`);
        return null;
    }
}

async function deleteFromS3(key) {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен, пропускаем удаление: ${key}`);
        return false;
    }
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        console.log(`🗑️ Файл удален из S3: ${key}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка удаления из S3: ${error.message}`);
        return false;
    }
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
module.exports = {
    s3Client,
    s3Config,
    BUCKET_NAME,
    s3Connected,
    testS3Connection,
    uploadToS3,
    downloadFromS3,
    deleteFromS3
};

// ===== СОЗДАНИЕ ПАПОК =====
const SESSIONS_DIR = path.join(__dirname, 'sessions');
const DATA_DIR = path.join(__dirname, 'data');

[SESSIONS_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            console.log(`📁 Создана папка: ${dir}`);
        } catch (error) {
            console.error(`❌ Ошибка создания папки ${dir}:`, error.message);
        }
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ S3 =====
console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');
console.log(`  ├─ Endpoint: ${s3Config.endpoint}`);
console.log(`  ├─ Bucket: ${BUCKET_NAME}`);
console.log(`  ├─ Access Key: ${s3Config.credentials.accessKeyId.substring(0, 8)}...`);
console.log(`  └─ Region: ${s3Config.region}`);
console.log('📦 ============================\n');

// Проверяем подключение при старте
(async () => {
    await testS3Connection();
})();

// ===== НАСТРОЙКА ПРИЛОЖЕНИЯ =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== СЕССИИ =====
app.use(session({
    store: new FileStore({
        path: SESSIONS_DIR,
        ttl: 7 * 24 * 60 * 60,
        retries: 0,
        reapInterval: 60 * 60
    }),
    secret: process.env.SESSION_SECRET || 'super-secret-key-for-deep-gaze-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ===== ЛОГИРОВАНИЕ =====
app.use((req, res, next) => {
    const startTime = Date.now();
    const sessionId = req.session ? req.session.id : 'НЕТ';
    const userId = req.session?.user?.login || 'НЕТ';
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    console.log(`  ├─ Session: ${sessionId}`);
    console.log(`  ├─ User: ${userId}`);
    console.log(`  └─ S3: ${s3Connected ? '✅ Подключен' : '❌ Локально'}`);
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`  └─ ⏱️ ${duration}ms → ${res.statusCode}`);
    });
    
    next();
});

// ===== МАРШРУТЫ =====
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// ===== СТАТУС S3 =====
app.get('/api/s3-status', (req, res) => {
    res.json({
        connected: s3Connected,
        timestamp: new Date().toISOString(),
        bucket: BUCKET_NAME,
        endpoint: s3Config.endpoint
    });
});

// ===== 404 =====
app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📌 S3 статус: ${s3Connected ? '✅ Подключен' : '❌ Локальное хранилище'}`);
    console.log('📌 Войдите под admin / admin123');
    console.log('📌 Проверить S3: /api/s3-status');
});
