const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const s3 = require('./config/s3');

// ===== СОЗДАНИЕ ПАПОК (только для сессий) =====
const SESSIONS_DIR = path.join(__dirname, 'sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
    try {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true, mode: 0o755 });
        console.log(`📁 Создана папка сессий: ${SESSIONS_DIR}`);
    } catch (error) {
        console.error(`❌ Ошибка создания папки сессий:`, error.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ S3 =====
console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');
console.log(`  ├─ Endpoint: ${s3.s3Config.endpoint}`);
console.log(`  ├─ Bucket: ${s3.BUCKET_NAME}`);
console.log(`  ├─ Access Key: ${s3.s3Config.credentials.accessKeyId.substring(0, 8)}...`);
console.log(`  └─ Region: ${s3.s3Config.region}`);
console.log('📦 ============================\n');

// Проверяем подключение при старте
(async () => {
    await s3.testS3Connection();
    
    if (s3.s3Connected) {
        // Проверяем существующие файлы
        const files = await s3.listS3Files('data/');
        if (files.length > 0) {
            console.log(`📁 Найдено файлов в S3: ${files.length}`);
            console.log(`  └─ ${files.join(', ')}`);
        } else {
            console.log('📄 В S3 нет файлов. Они будут созданы при первом сохранении.');
        }
    }
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
    console.log(`  └─ S3: ${s3.s3Connected ? '✅ Подключен' : '❌ Локально'}`);
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`  └─ ⏱️ ${duration}ms → ${res.statusCode}`);
    });
    
    next();
});

// ===== МАРШРУТЫ =====
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// ===== API СТАТУС S3 =====
app.get('/api/s3-status', (req, res) => {
    res.json({
        connected: s3.s3Connected,
        timestamp: new Date().toISOString(),
        bucket: s3.BUCKET_NAME,
        endpoint: s3.s3Config.endpoint,
        region: s3.s3Config.region
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
    console.log(`📌 S3 статус: ${s3.s3Connected ? '✅ Подключен' : '❌ Локальное хранилище'}`);
    console.log('📌 Войдите под admin / admin123');
    console.log('📌 Проверить S3: /api/s3-status');
});
