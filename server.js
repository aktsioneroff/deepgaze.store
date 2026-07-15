const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ===== ПОДКЛЮЧЕНИЕ S3 =====
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

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
const s3Client = new S3Client(s3Config);
let s3Connected = false;

// ===== ФУНКЦИИ РАБОТЫ С S3 =====
async function testS3() {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log('✅ S3 подключен успешно!');
        s3Connected = true;
        return true;
    } catch (error) {
        console.error('❌ Ошибка S3:', error.message);
        s3Connected = false;
        return false;
    }
}

async function readS3(key) {
    if (!s3Connected) return null;
    try {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const result = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        const body = await result.Body.transformToString();
        return JSON.parse(body);
    } catch (error) {
        if (error.name === 'NoSuchKey') return null;
        console.error('Ошибка чтения S3:', error.message);
        return null;
    }
}

async function writeS3(key, data) {
    if (!s3Connected) return false;
    try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        }));
        return true;
    } catch (error) {
        console.error('Ошибка записи S3:', error.message);
        return false;
    }
}

// ===== ЭКСПОРТ ФУНКЦИЙ ДЛЯ КОНТРОЛЛЕРОВ =====
async function readData(fileName) {
    const data = await readS3(`data/${fileName}`);
    if (data) {
        console.log(`📖 Загружено: ${fileName}`);
        return data;
    }
    console.log(`📄 Новый файл: ${fileName}`);
    return [];
}

async function writeData(fileName, data) {
    const result = await writeS3(`data/${fileName}`, data);
    if (result) {
        console.log(`💾 Сохранено: ${fileName}`);
    }
    return result;
}

// ===== СОЗДАНИЕ ПАПКИ СЕССИЙ =====
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true, mode: 0o755 });
}

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ =====
console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');
console.log(`  ├─ Endpoint: ${s3Config.endpoint}`);
console.log(`  ├─ Bucket: ${BUCKET_NAME}`);
console.log(`  └─ Region: ${s3Config.region}`);
console.log('📦 ============================\n');

testS3();

// ===== НАСТРОЙКА =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    store: new FileStore({
        path: SESSIONS_DIR,
        ttl: 7 * 24 * 60 * 60,
        retries: 0
    }),
    secret: 'super-secret-key-for-deep-gaze-2025',
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
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ===== ПОДКЛЮЧЕНИЕ МАРШРУТОВ =====
const portalRoutes = require('./routes/portal');
app.use('/', portalRoutes);

// ===== S3 СТАТУС =====
app.get('/api/s3-status', (req, res) => {
    res.json({
        connected: s3Connected,
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
    console.log(`📌 S3: ${s3Connected ? '✅ Подключен' : '❌ Недоступен'}`);
    console.log('📌 Войдите под admin / admin123');
});

// ===== ЭКСПОРТ ФУНКЦИЙ =====
module.exports = {
    readData,
    writeData,
    s3Connected,
    BUCKET_NAME,
    s3Config
};
