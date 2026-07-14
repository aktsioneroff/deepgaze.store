const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
require('dotenv').config();

const s3 = require('./config/s3');
const s3Data = require('./utils/s3Data');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ИНИЦИАЛИЗАЦИЯ S3 =====
console.log('\n📦 ===== S3 ИНИЦИАЛИЗАЦИЯ =====');
s3.logS3Connection();

let s3Connected = false;
(async () => {
    s3Connected = await s3.testS3Connection();
    if (s3Connected) {
        console.log('🚀 S3 готов к работе!');
        const files = await s3Data.listDataFiles();
        console.log(`📁 Найдено файлов в S3: ${files.length}`);
        if (files.length === 0) {
            console.log('💡 Совет: запустите npm run migrate-s3 для переноса данных');
        }
    } else {
        console.log('⚠️ S3 не доступен, данные будут храниться локально');
    }
})();

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
    console.log(`📌 S3 статус: ${s3Connected ? '✅ Подключен' : '❌ Недоступен'}`);
    console.log('📌 Войдите под admin / admin123');
});
