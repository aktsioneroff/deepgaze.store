const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
require('dotenv').config();

// Пытаемся подключить S3, если есть
let s3 = null;
let s3Data = null;

try {
    s3 = require('./config/s3');
    s3Data = require('./utils/s3Data');
    console.log('✅ S3 модули загружены');
} catch (error) {
    console.log('⚠️ S3 не доступен, работаем с локальными файлами');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ =====
if (s3 && s3Data) {
    console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');
    s3.logS3Connection();
    
    (async () => {
        const connected = await s3.testS3Connection();
        if (connected) {
            console.log('🚀 S3 готов к работе!');
        } else {
            console.log('⚠️ S3 не доступен, данные будут храниться локально');
        }
    })();
} else {
    console.log('📁 Работаем с локальным хранилищем данных');
}

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
    console.log(`  ├─ Session: ${req.session ? req.session.id : 'НЕТ'}`);
    console.log(`  └─ User: ${req.session?.user?.login || 'НЕТ'}`);
    next();
});

const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log('📌 Войдите под admin / admin123');
});
