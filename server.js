const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ДИАГНОСТИКА =====
const projectRoot = __dirname;
console.log('📁 __dirname:', projectRoot);

// Проверяем существование папок
const viewsPath = path.join(projectRoot, 'views');
const publicPath = path.join(projectRoot, 'public');

console.log('📁 Views path:', viewsPath);
console.log('📁 Public path:', publicPath);

if (!fs.existsSync(viewsPath)) {
    console.error('❌ Папка views не найдена!');
    process.exit(1);
}

if (!fs.existsSync(publicPath)) {
    console.error('❌ Папка public не найдена!');
    process.exit(1);
}

console.log('✅ Все папки найдены');

// ===== НАСТРОЙКА VIEWS =====
app.set('view engine', 'ejs');
app.set('views', viewsPath);

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// ===== СЕССИИ =====
const sessionsPath = path.join(projectRoot, 'sessions');
if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
    console.log('📁 Создана папка sessions');
}

app.use(session({
    store: new FileStore({
        path: sessionsPath,
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

// ===== ЛОГИРОВАНИЕ =====
app.use((req, res, next) => {
    const sessionId = req.session ? req.session.id : 'НЕТ СЕССИИ';
    const userId = req.session?.user?.login || 'НЕТ ПОЛЬЗОВАТЕЛЯ';
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    console.log(`  ├─ Session ID: ${sessionId}`);
    console.log(`  └─ User: ${userId}`);
    next();
});

// ===== МАРШРУТЫ =====
try {
    const indexRoutes = require('./routes/index');
    app.use('/', indexRoutes);
    console.log('✅ Маршруты загружены');
} catch (error) {
    console.error('❌ Ошибка загрузки маршрутов:', error.message);
    process.exit(1);
}

// ===== 404 =====
app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

// ===== ОБРАБОТКА ОШИБОК =====
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err.message);
    console.error(err.stack);
    res.status(500).send('Внутренняя ошибка сервера');
});

// ===== ЗАПУСК =====
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Views: ${viewsPath}`);
    console.log(`📁 Public: ${publicPath}`);
    console.log(`📁 Sessions: ${sessionsPath}`);
    console.log('📌 Войдите под admin / admin123');
});

// ===== ОБРАБОТКА SIGTERM =====
process.on('SIGTERM', () => {
    console.log('📌 Получен SIGTERM, завершаем работу...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📌 Получен SIGINT, завершаем работу...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

// ===== ОБРАБОТКА НЕОБРАБОТАННЫХ ОШИБОК =====
process.on('uncaughtException', (err) => {
    console.error('❌ Необработанная ошибка:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанный reject:', reason);
});
