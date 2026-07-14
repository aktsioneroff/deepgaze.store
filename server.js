const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ПРАВИЛЬНАЯ НАСТРОЙКА ПУТЕЙ =====
// Получаем абсолютный путь к корню проекта
const projectRoot = path.resolve(__dirname);

// Настройка EJS
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(projectRoot, 'public')));

// ===== НАСТРОЙКА СЕССИЙ =====
app.use(session({
    store: new FileStore({
        path: path.join(projectRoot, 'sessions'),
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
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// 404
app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Views: ${path.join(projectRoot, 'views')}`);
    console.log(`📁 Public: ${path.join(projectRoot, 'public')}`);
    console.log(`📁 Sessions: ${path.join(projectRoot, 'sessions')}`);
    console.log('📌 Войдите под admin / admin123');
});
