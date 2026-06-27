const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ЛОГИРОВАНИЕ =====
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ===== ПРОВЕРКА ПЕРЕМЕННЫХ S3 ПРИ ЗАПУСКЕ =====
console.log('========================================');
console.log('🔍 ПРОВЕРКА ПЕРЕМЕННЫХ S3:');
console.log('📦 S3_BUCKET:', process.env.S3_BUCKET || '❌ не задан');
console.log('🔑 S3_ACCESS_KEY:', process.env.S3_ACCESS_KEY ? '✅ установлен (' + process.env.S3_ACCESS_KEY.substring(0, 8) + '...)' : '❌ не найден');
console.log('🔑 S3_SECRET_KEY:', process.env.S3_SECRET_KEY ? '✅ установлен (' + process.env.S3_SECRET_KEY.substring(0, 8) + '...)' : '❌ не найден');
console.log('🌐 S3_ENDPOINT:', process.env.S3_ENDPOINT || '❌ не задан (используем default)');
console.log('📍 S3_REGION:', process.env.S3_REGION || '❌ не задан (используем default)');
console.log('========================================');

// ===== НАСТРОЙКА S3 =====
const s3Config = {
    endpoint: process.env.S3_ENDPOINT || 'https://swift.twcstorage.ru',
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION || 'ru-1',
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    httpOptions: {
        timeout: 30000,
        connectTimeout: 30000
    }
};

// Проверяем, есть ли ключи
if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
    console.error('❌ ВНИМАНИЕ: S3 ключи не найдены! Загрузка фото НЕ БУДЕТ РАБОТАТЬ!');
    console.error('   Добавьте переменные S3_ACCESS_KEY и S3_SECRET_KEY в настройках приложения');
} else {
    console.log('✅ S3 ключи найдены, подключаемся...');
}

const s3 = new AWS.S3(s3Config);
const BUCKET_NAME = process.env.S3_BUCKET || 'b84d36c2-5e58-406e-9d3d-5754fe0dda39';

// ===== ПУТИ К ДАННЫМ =====
const DATA_DIR = path.join(__dirname, 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ===== СОЗДАЕМ ПАПКУ DATA =====
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ===== MULTER (используем memory storage для S3) =====
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== СЕССИИ =====
app.use(session({
    secret: 'deep-gaze-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ===== ИНИЦИАЛИЗАЦИЯ ДАННЫХ =====
function initDataFiles() {
    const files = {
        [REQUESTS_FILE]: '[]',
        [SERVICES_FILE]: '[]',
        [PORTFOLIO_FILE]: '[]',
        [USERS_FILE]: '[]'
    };
    
    for (const [filePath, defaultContent] of Object.entries(files)) {
        if (!fs.existsSync(filePath)) {
            try {
                fs.writeFileSync(filePath, defaultContent);
                console.log(`✅ Создан файл: ${filePath}`);
            } catch (e) {
                console.error(`❌ Ошибка создания ${filePath}:`, e);
            }
        }
    }
    
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (users.length === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            users.push({
                id: Date.now(),
                username: 'admin',
                password: hashedPassword,
                fullName: 'Администратор',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            console.log('✅ Администратор создан');
        }
    } catch (e) {
        console.error('❌ Ошибка инициализации:', e);
    }
}

initDataFiles();

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function readJSONFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`❌ Ошибка чтения ${filePath}:`, e);
        return [];
    }
}

function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`❌ Ошибка записи ${filePath}:`, e);
    }
}

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Необходима авторизация' });
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).json({ error: 'Доступ запрещен' });
}

// ===== ФУНКЦИЯ ЗАГРУЗКИ В S3 =====
async function uploadToS3(file, folder = '') {
    const key = `${folder}${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
    };
    
    try {
        console.log(`📤 Загрузка в S3: ${key}`);
        const result = await s3.upload(params).promise();
        console.log(`✅ Загружено в S3: ${result.Location}`);
        return result.Location;
    } catch (error) {
        console.error('❌ Ошибка загрузки в S3:', error);
        throw error;
    }
}

// ===== ТЕСТОВЫЙ МАРШРУТ ДЛЯ ПРОВЕРКИ S3 =====
app.get('/api/test-s3', async (req, res) => {
    try {
        const config = {
            endpoint: process.env.S3_ENDPOINT || 'не задан',
            bucket: process.env.S3_BUCKET || 'не задан',
            region: process.env.S3_REGION || 'не задан',
            hasAccessKey: !!process.env.S3_ACCESS_KEY,
            hasSecretKey: !!process.env.S3_SECRET_KEY,
            accessKeyStart: process.env.S3_ACCESS_KEY ? process.env.S3_ACCESS_KEY.substring(0, 8) + '...' : 'нет'
        };
        
        // Пробуем получить список файлов в бакете
        let listResult = null;
        if (config.hasAccessKey && config.hasSecretKey) {
            try {
                const listParams = { Bucket: BUCKET_NAME, MaxKeys: 5 };
                listResult = await s3.listObjectsV2(listParams).promise();
                listResult = {
                    success: true,
                    count: listResult.Contents?.length || 0
                };
            } catch (e) {
                listResult = { error: e.message };
            }
        }
        
        res.json({
            success: true,
            config: config,
            listResult: listResult,
            message: 'Проверьте, что все переменные заданы в Timeweb'
        });
    } catch (error) {
        console.error('S3 test error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// ===== МАРШРУТЫ =====
// ============================================

// ----- АВТОРИЗАЦИЯ -----
app.post('/api/login', (req, res) => {
    console.log('[LOGIN] Request received');
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Введите логин и пароль' });
        }
        
        const users = readJSONFile(USERS_FILE);
        const user = users.find(u => u.username === username);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        };
        
        console.log('[LOGIN] Success:', username);
        res.json({ success: true, user: req.session.user });
    } catch (e) {
        console.error('[LOGIN] Error:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ authenticated: !!req.session.user, user: req.session.user || null });
});

// ----- ЗАЯВКИ -----
app.get('/api/requests', isAuthenticated, (req, res) => {
    res.json(readJSONFile(REQUESTS_FILE));
});

app.post('/api/requests', (req, res) => {
    console.log('[REQUEST] New:', req.body);
    
    try {
        const requests = readJSONFile(REQUESTS_FILE);
        const newRequest = {
            id: Date.now(),
            name: req.body.name || 'Без имени',
            phone: req.body.phone || 'Без телефона',
            date: req.body.date || new Date().toISOString().split('T')[0],
            time: req.body.time || '',
            status: req.body.status || 'new',
            comment: req.body.comment || '',
            source: req.body.source || 'website',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.session.user ? req.session.user.fullName : 'Клиент с сайта'
        };
        requests.push(newRequest);
        writeJSONFile(REQUESTS_FILE, requests);
        res.status(201).json(newRequest);
    } catch (e) {
        console.error('[REQUEST] Error:', e);
        res.status(500).json({ error: 'Ошибка создания заявки' });
    }
});

app.put('/api/requests/:id', isAuthenticated, (req, res) => {
    try {
        const requests = readJSONFile(REQUESTS_FILE);
        const index = requests.findIndex(r => r.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ error: 'Не найдено' });
        requests[index] = { ...requests[index], ...req.body, id: requests[index].id, updatedAt: new Date().toISOString() };
        writeJSONFile(REQUESTS_FILE, requests);
        res.json(requests[index]);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.delete('/api/requests/:id', isAuthenticated, (req, res) => {
    try {
        let requests = readJSONFile(REQUESTS_FILE);
        requests = requests.filter(r => r.id !== parseInt(req.params.id));
        writeJSONFile(REQUESTS_FILE, requests);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// ----- УСЛУГИ (С S3) -----
app.get('/api/services', (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        if (!req.session.user) {
            return res.json(services.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 6));
        }
        res.json(services);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.post('/api/services', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        
        let photoUrl = null;
        if (req.file) {
            photoUrl = await uploadToS3(req.file, 'services/');
        }
        
        const newService = {
            id: Date.now(),
            name: req.body.name || 'Без названия',
            description: req.body.description || '',
            price: parseFloat(req.body.price) || 0,
            priority: parseInt(req.body.priority) || 0,
            photo: photoUrl,
            createdAt: new Date().toISOString()
        };
        
        services.push(newService);
        writeJSONFile(SERVICES_FILE, services);
        res.status(201).json(newService);
    } catch (e) {
        console.error('[SERVICES] Create error:', e);
        res.status(500).json({ error: 'Ошибка создания услуги' });
    }
});

app.put('/api/services/:id', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        const index = services.findIndex(s => s.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ error: 'Не найдено' });
        
        let photoUrl = services[index].photo;
        if (req.file) {
            photoUrl = await uploadToS3(req.file, 'services/');
        }
        
        services[index] = {
            ...services[index],
            name: req.body.name || services[index].name,
            description: req.body.description || services[index].description,
            price: parseFloat(req.body.price) || services[index].price,
            priority: parseInt(req.body.priority) || 0,
            photo: photoUrl
        };
        
        writeJSONFile(SERVICES_FILE, services);
        res.json(services[index]);
    } catch (e) {
        console.error('[SERVICES] Update error:', e);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

app.delete('/api/services/:id', isAuthenticated, (req, res) => {
    let services = readJSONFile(SERVICES_FILE);
    services = services.filter(s => s.id !== parseInt(req.params.id));
    writeJSONFile(SERVICES_FILE, services);
    res.json({ success: true });
});

// ----- ПОРТФОЛИО (С S3) -----
app.get('/api/portfolio', (req, res) => {
    try {
        const portfolio = readJSONFile(PORTFOLIO_FILE);
        const services = readJSONFile(SERVICES_FILE);
        const enriched = portfolio.map(item => ({
            ...item,
            serviceName: services.find(s => s.id === parseInt(item.serviceId))?.name || 'Без категории'
        }));
        res.json(enriched);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.post('/api/portfolio', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Нужно изображение' });
        
        const portfolio = readJSONFile(PORTFOLIO_FILE);
        const photoUrl = await uploadToS3(req.file, 'portfolio/');
        
        const newItem = {
            id: Date.now(),
            serviceId: parseInt(req.body.serviceId),
            photo: photoUrl,
            description: req.body.description || '',
            createdAt: new Date().toISOString(),
            createdBy: req.session.user.fullName
        };
        
        portfolio.push(newItem);
        writeJSONFile(PORTFOLIO_FILE, portfolio);
        res.status(201).json(newItem);
    } catch (e) {
        console.error('[PORTFOLIO] Create error:', e);
        res.status(500).json({ error: 'Ошибка добавления работы' });
    }
});

app.delete('/api/portfolio/:id', isAuthenticated, (req, res) => {
    let portfolio = readJSONFile(PORTFOLIO_FILE);
    portfolio = portfolio.filter(p => p.id !== parseInt(req.params.id));
    writeJSONFile(PORTFOLIO_FILE, portfolio);
    res.json({ success: true });
});

// ----- СОТРУДНИКИ -----
app.get('/api/users', isAdmin, (req, res) => {
    const users = readJSONFile(USERS_FILE);
    res.json(users.map(({ password, ...u }) => u));
});

app.post('/api/users', isAdmin, (req, res) => {
    try {
        const users = readJSONFile(USERS_FILE);
        if (users.find(u => u.username === req.body.username)) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        const newUser = {
            id: Date.now(),
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, 10),
            fullName: req.body.fullName,
            role: req.body.role || 'photographer',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeJSONFile(USERS_FILE, users);
        const { password, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (e) {
        console.error('[USERS] Create error:', e);
        res.status(500).json({ error: 'Ошибка создания пользователя' });
    }
});

app.put('/api/users/:id', isAdmin, (req, res) => {
    try {
        const users = readJSONFile(USERS_FILE);
        const index = users.findIndex(u => u.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ error: 'Не найден' });
        users[index] = {
            ...users[index],
            fullName: req.body.fullName || users[index].fullName,
            username: req.body.username || users[index].username,
            role: req.body.role || users[index].role
        };
        if (req.body.password) {
            users[index].password = bcrypt.hashSync(req.body.password, 10);
        }
        writeJSONFile(USERS_FILE, users);
        const { password, ...safeUser } = users[index];
        res.json(safeUser);
    } catch (e) {
        console.error('[USERS] Update error:', e);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

app.delete('/api/users/:id', isAdmin, (req, res) => {
    let users = readJSONFile(USERS_FILE);
    if (parseInt(req.params.id) === req.session.user.id) {
        return res.status(400).json({ error: 'Нельзя удалить себя' });
    }
    users = users.filter(u => u.id !== parseInt(req.params.id));
    writeJSONFile(USERS_FILE, users);
    res.json({ success: true });
});

// ----- СТАТИКА -----
app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Deep Gaze Studio запущена на порту ${PORT}`);
    console.log(`📦 S3 Bucket: ${BUCKET_NAME}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin/login.html`);
    console.log(`========================================`);
});
