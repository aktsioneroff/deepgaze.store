const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
require('dotenv').config();

// ===== ПОДКЛЮЧЕНИЕ S3 =====
let s3 = null;
let s3Connected = false;
let s3Data = null;

try {
    s3 = require('./config/s3');
    s3Data = require('./utils/s3Data');
    console.log('✅ S3 модули загружены');
} catch (error) {
    console.log('⚠️ S3 модули не найдены, работаем с локальным хранилищем');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ S3 С ЛОГИРОВАНИЕМ =====
console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');

if (s3) {
    try {
        s3.logS3Connection();
        
        // Проверяем подключение
        (async () => {
            console.log('🔍 Проверка подключения к S3...');
            const startTime = Date.now();
            
            try {
                s3Connected = await s3.testS3Connection();
                const duration = Date.now() - startTime;
                
                if (s3Connected) {
                    console.log(`✅ S3 подключен успешно (${duration}ms)`);
                    
                    // Проверяем наличие данных
                    if (s3Data) {
                        const files = await s3Data.listDataFiles();
                        console.log(`📁 Найдено файлов в S3: ${files.length}`);
                        if (files.length > 0) {
                            console.log(`  └─ Файлы: ${files.join(', ')}`);
                        } else {
                            console.log('  └─ Файлов нет, будут созданы при первом сохранении');
                        }
                    }
                } else {
                    console.log(`⚠️ S3 не доступен (${duration}ms), используем локальное хранилище`);
                    console.log('  └─ Данные будут храниться в папке data/');
                }
            } catch (error) {
                console.error(`❌ Ошибка при проверке S3: ${error.message}`);
                console.log('  └─ Используем локальное хранилище');
                s3Connected = false;
            }
        })();
    } catch (error) {
        console.error('❌ Ошибка инициализации S3:', error.message);
        s3Connected = false;
    }
} else {
    console.log('📁 S3 не настроен, используем локальное хранилище');
    console.log('  └─ Данные будут храниться в папке data/');
}

console.log('📦 ============================\n');

// ===== НАСТРОЙКА ПРИЛОЖЕНИЯ =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== СЕССИИ =====
app.use(session({
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 7 * 24 * 60 * 60,
        retries: 0
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

// ===== ПОДРОБНОЕ ЛОГИРОВАНИЕ ЗАПРОСОВ =====
app.use((req, res, next) => {
    const startTime = Date.now();
    const sessionId = req.session ? req.session.id : 'НЕТ';
    const userId = req.session?.user?.login || 'НЕТ';
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    console.log(`  ├─ Session: ${sessionId}`);
    console.log(`  ├─ User: ${userId}`);
    console.log(`  └─ S3: ${s3Connected ? '✅ Подключен' : '❌ Локально'}`);
    
    // Логируем завершение запроса
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
    const status = {
        connected: s3Connected,
        timestamp: new Date().toISOString(),
        bucket: s3 ? s3.BUCKET_NAME : null,
        endpoint: s3 ? s3.s3Config?.endpoint : null
    };
    
    console.log('📊 Запрос статуса S3:', status);
    res.json(status);
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
