const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем директории
const dirs = ['data', 'uploads'];
dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: 'deep-gaze-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Инициализация данных
function initDataFiles() {
    const files = {
        [REQUESTS_FILE]: '[]',
        [SERVICES_FILE]: '[]',
        [PORTFOLIO_FILE]: '[]',
        [USERS_FILE]: '[]'
    };
    
    for (const [filePath, defaultContent] of Object.entries(files)) {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, defaultContent);
        }
    }
    
    // Создаем админа
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
        }
    } catch (e) {
        console.error('Init error:', e);
    }
}

initDataFiles();

// Helpers
function readJSONFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeJSONFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Auth middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Необходима авторизация' });
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).json({ error: 'Доступ запрещен' });
}

// Auth routes
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readJSONFile(USERS_FILE);
        const user = users.find(u => u.username === username);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        req.session.user = {
            id: user.id, username: user.username,
            fullName: user.fullName, role: user.role
        };
        
        res.json({ success: true, user: req.session.user });
    } catch (e) {
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
    res.json({ 
        authenticated: !!req.session.user, 
        user: req.session.user || null 
    });
});

// Requests CRUD
app.get('/api/requests', isAuthenticated, (req, res) => {
    res.json(readJSONFile(REQUESTS_FILE));
});

app.post('/api/requests', (req, res) => {
    try {
        const requests = readJSONFile(REQUESTS_FILE);
        const newRequest = {
            id: Date.now(),
            name: req.body.name,
            phone: req.body.phone,
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
        res.status(500).json({ error: 'Ошибка создания заявки' });
    }
});

app.put('/api/requests/:id', isAuthenticated, (req, res) => {
    try {
        const requests = readJSONFile(REQUESTS_FILE);
        const index = requests.findIndex(r => r.id === parseInt(req.params.id));
        
        if (index === -1) return res.status(404).json({ error: 'Заявка не найдена' });
        
        requests[index] = { ...requests[index], ...req.body, id: requests[index].id, updatedAt: new Date().toISOString() };
        writeJSONFile(REQUESTS_FILE, requests);
        res.json(requests[index]);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

app.delete('/api/requests/:id', isAuthenticated, (req, res) => {
    try {
        let requests = readJSONFile(REQUESTS_FILE);
        requests = requests.filter(r => r.id !== parseInt(req.params.id));
        writeJSONFile(REQUESTS_FILE, requests);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// Services CRUD
app.get('/api/services', (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        if (!req.session.user) {
            return res.json(services.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 6));
        }
        res.json(services);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка получения услуг' });
    }
});

app.post('/api/services', isAuthenticated, upload.single('photo'), (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        const newService = {
            id: Date.now(),
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price) || 0,
            priority: parseInt(req.body.priority) || 0,
            photo: req.file ? `/uploads/${req.file.filename}` : null,
            createdAt: new Date().toISOString()
        };
        
        services.push(newService);
        writeJSONFile(SERVICES_FILE, services);
        res.status(201).json(newService);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка создания услуги' });
    }
});

app.put('/api/services/:id', isAuthenticated, upload.single('photo'), (req, res) => {
    try {
        const services = readJSONFile(SERVICES_FILE);
        const index = services.findIndex(s => s.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ error: 'Не найдено' });
        
        services[index] = {
            ...services[index],
            name: req.body.name || services[index].name,
            description: req.body.description || services[index].description,
            price: parseFloat(req.body.price) || services[index].price,
            priority: parseInt(req.body.priority) || 0,
            photo: req.file ? `/uploads/${req.file.filename}` : services[index].photo
        };
        
        writeJSONFile(SERVICES_FILE, services);
        res.json(services[index]);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

app.delete('/api/services/:id', isAuthenticated, (req, res) => {
    let services = readJSONFile(SERVICES_FILE);
    services = services.filter(s => s.id !== parseInt(req.params.id));
    writeJSONFile(SERVICES_FILE, services);
    res.json({ success: true });
});

// Portfolio CRUD
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

app.post('/api/portfolio', isAuthenticated, upload.single('photo'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Нужно изображение' });
        
        const portfolio = readJSONFile(PORTFOLIO_FILE);
        const newItem = {
            id: Date.now(),
            serviceId: parseInt(req.body.serviceId),
            photo: `/uploads/${req.file.filename}`,
            description: req.body.description || '',
            createdAt: new Date().toISOString(),
            createdBy: req.session.user.fullName
        };
        
        portfolio.push(newItem);
        writeJSONFile(PORTFOLIO_FILE, portfolio);
        res.status(201).json(newItem);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

app.delete('/api/portfolio/:id', isAuthenticated, (req, res) => {
    let portfolio = readJSONFile(PORTFOLIO_FILE);
    portfolio = portfolio.filter(p => p.id !== parseInt(req.params.id));
    writeJSONFile(PORTFOLIO_FILE, portfolio);
    res.json({ success: true });
});

// Users CRUD
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
        res.status(500).json({ error: 'Ошибка' });
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
        res.status(500).json({ error: 'Ошибка' });
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

// Static pages
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
    console.log(`Deep Gaze Studio запущена на порту ${PORT}`);
});