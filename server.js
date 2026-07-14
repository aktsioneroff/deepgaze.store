const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ШИФРОВАНИЕ ДАННЫХ =====
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('❌ Ошибка шифрования:', error.message);
        return text;
    }
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('❌ Ошибка дешифровки:', error.message);
        return text;
    }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== СЕССИИ С ШИФРОВАНИЕМ =====
app.use(session({
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 7 * 24 * 60 * 60,
        retries: 0,
        encrypt: true,
        encryptFn: encrypt,
        decryptFn: decrypt
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
    console.log(`  └─ User: ${userId}`);
    
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

app.use((req, res) => {
    res.status(404).render('pages/404', { 
        title: 'Страница не найдена',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log('📌 Войдите под admin / admin123');
    console.log(`🔐 Шифрование: ${ENCRYPTION_KEY ? '✅ Активно' : '❌ Отключено'}`);
});