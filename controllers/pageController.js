const fs = require('fs');
const path = require('path');

const EMPLOYEES_FILE = path.join(__dirname, '../data/employees.json');

function loadEmployees() {
    try {
        if (fs.existsSync(EMPLOYEES_FILE)) {
            const data = fs.readFileSync(EMPLOYEES_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        return [];
    }
}

const users = {
    'admin': { password: 'Seven7zsxa@@@', name: 'Администратор', role: 'admin' }
};

// ===== ПРАВА ДОСТУПА ПО ДОЛЖНОСТЯМ =====
const rolePermissions = {
    'Фотограф, стажер': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: false, create: false, edit: false, delete: false },
        portfolio: { view: false, create: false, edit: false, delete: false },
        partners: { view: false, create: false, edit: false, delete: false },
        branches: { view: false, create: false, edit: false, delete: false },
        employees: { view: false, create: false, edit: false, delete: false },
        referrals: { view: true, create: true, edit: true, delete: true }
    },
    'Фотограф': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: false, create: false, edit: false, delete: false },
        portfolio: { view: false, create: false, edit: false, delete: false },
        partners: { view: false, create: false, edit: false, delete: false },
        branches: { view: false, create: false, edit: false, delete: false },
        employees: { view: false, create: false, edit: false, delete: false },
        referrals: { view: true, create: true, edit: true, delete: true }
    },
    'Фотограф, старший': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: false, create: false, edit: false, delete: false },
        portfolio: { view: true, create: true, edit: true, delete: true },
        partners: { view: false, create: false, edit: false, delete: false },
        branches: { view: false, create: false, edit: false, delete: false },
        employees: { view: false, create: false, edit: false, delete: false },
        referrals: { view: true, create: true, edit: true, delete: true }
    },
    'Управляющий': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: true, create: true, edit: true, delete: true },
        portfolio: { view: true, create: true, edit: true, delete: true },
        partners: { view: false, create: false, edit: false, delete: false },
        branches: { view: false, create: false, edit: false, delete: false },
        employees: { view: false, create: false, edit: false, delete: false },
        referrals: { view: true, create: true, edit: true, delete: true }
    },
    'Директор': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: true, create: true, edit: true, delete: true },
        portfolio: { view: true, create: true, edit: true, delete: true },
        partners: { view: true, create: true, edit: true, delete: true },
        branches: { view: false, create: false, edit: false, delete: false },
        employees: { view: true, create: true, edit: true, delete: true },
        referrals: { view: true, create: true, edit: true, delete: true }
    },
    'Генеральный директор': {
        requests: { view: true, create: true, edit: true, delete: true },
        services: { view: true, create: true, edit: true, delete: true },
        portfolio: { view: true, create: true, edit: true, delete: true },
        partners: { view: true, create: true, edit: true, delete: true },
        branches: { view: true, create: true, edit: true, delete: true },
        employees: { view: true, create: true, edit: true, delete: true },
        referrals: { view: true, create: true, edit: true, delete: true }
    }
};

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ПРАВ =====
function getUserPermissions(user) {
    if (!user) return null;
    if (user.role === 'admin') {
        // Администратор имеет все права
        return {
            requests: { view: true, create: true, edit: true, delete: true },
            services: { view: true, create: true, edit: true, delete: true },
            portfolio: { view: true, create: true, edit: true, delete: true },
            partners: { view: true, create: true, edit: true, delete: true },
            branches: { view: true, create: true, edit: true, delete: true },
            employees: { view: true, create: true, edit: true, delete: true },
            referrals: { view: true, create: true, edit: true, delete: true }
        };
    }
    // Для сотрудников - по должности
    return rolePermissions[user.position] || null;
}

exports.getIndex = (req, res) => {
    res.render('pages/index', {
        title: 'DEEP GAZE — Студия макросъемки радужки глаза',
        user: req.session.user || null,
        error: null
    });
};

exports.getLogin = (req, res) => {
    console.log('📌 GET /login - Проверка сессии...');
    console.log(`  ├─ Session ID: ${req.session ? req.session.id : 'НЕТ'}`);
    console.log(`  ├─ User: ${req.session?.user?.login || 'НЕТ'}`);
    
    if (req.session && req.session.user) {
        console.log('  └─ Пользователь уже авторизован, редирект на /dashboard');
        return res.redirect('/dashboard');
    }
    console.log('  └─ Показываем страницу логина');
    res.render('pages/login', {
        title: 'Вход в портал — DEEP GAZE',
        error: req.query.error || null
    });
};

exports.login = (req, res) => {
    console.log('🔥🔥🔥 POST /login ВЫЗВАН! 🔥🔥🔥');
    console.log('  ├─ Body:', req.body);
    
    const { login, password } = req.body;
    console.log(`  ├─ Login: ${login}`);
    console.log(`  └─ Password: ${password}`);
    
    // Проверяем администратора
    if (users[login] && users[login].password === password) {
        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Ошибка регенерации:', err);
                return res.redirect('/login?error=Ошибка сервера');
            }
            
            req.session.user = {
                login: login,
                name: users[login].name,
                role: 'admin',
                position: 'Администратор'
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Ошибка сохранения сессии:', err);
                    return res.redirect('/login?error=Ошибка сервера');
                }
                console.log('✅ Админ авторизован:', login);
                console.log(`  ├─ Session ID: ${req.session.id}`);
                console.log(`  └─ User: ${req.session.user.login}`);
                res.redirect('/dashboard');
            });
        });
        return;
    }
    
    // Проверяем сотрудников
    const employees = loadEmployees();
    const employee = employees.find(e => e.login === login && e.password === password);
    if (employee) {
        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Ошибка регенерации:', err);
                return res.redirect('/login?error=Ошибка сервера');
            }
            
            req.session.user = {
                login: employee.login,
                name: employee.fullName,
                role: 'employee',
                position: employee.position,
                employeeId: employee.id,
                branchId: employee.branchId
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Ошибка сохранения сессии:', err);
                    return res.redirect('/login?error=Ошибка сервера');
                }
                console.log('✅ Сотрудник авторизован:', employee.fullName);
                console.log(`  ├─ Session ID: ${req.session.id}`);
                console.log(`  ├─ Position: ${employee.position}`);
                console.log(`  └─ User: ${req.session.user.login}`);
                res.redirect('/dashboard');
            });
        });
        return;
    }
    
    console.log(`❌ Неверный логин или пароль: ${login}`);
    res.redirect('/login?error=Неверный логин или пароль');
};

exports.logout = (req, res) => {
    console.log('📌 GET /logout - Выход');
    req.session.destroy(() => {
        res.redirect('/');
    });
};

exports.requireAuth = (req, res, next) => {
    console.log('📌 requireAuth - Проверка');
    console.log(`  ├─ Session ID: ${req.session ? req.session.id : 'НЕТ'}`);
    console.log(`  └─ User: ${req.session?.user?.login || 'НЕТ'}`);
    
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login?error=Требуется авторизация');
    }
};

// ===== МИДЛВЕР ДЛЯ ПРОВЕРКИ ПРАВ НА МОДУЛЬ =====
exports.checkPermission = (module, action) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login?error=Требуется авторизация');
        }
        
        const user = req.session.user;
        const permissions = getUserPermissions(user);
        
        if (!permissions) {
            return res.status(403).render('pages/403', {
                title: 'Доступ запрещён',
                user: req.session.user || null
            });
        }
        
        const modulePerm = permissions[module];
        if (!modulePerm || !modulePerm[action]) {
            return res.status(403).render('pages/403', {
                title: 'Доступ запрещён',
                user: req.session.user || null
            });
        }
        
        next();
    };
};

exports.getDashboard = (req, res) => {
    console.log('📌 GET /dashboard - Отображение');
    const permissions = getUserPermissions(req.session.user);
    res.render('pages/dashboard', {
        title: 'Панель управления — DEEP GAZE',
        user: req.session.user,
        activePage: 'dashboard',
        permissions: permissions
    });
};

exports.getPortalPlaceholder = (req, res) => {
    const pageMap = {
        '/portal/referrals': { title: 'Реферальная система', icon: '🎯' }
    };
    const page = pageMap[req.path] || { title: 'Страница', icon: '📄' };
    res.render('pages/portal-placeholder', {
        title: page.title + ' — DEEP GAZE',
        user: req.session.user,
        activePage: req.path,
        pageTitle: page.title,
        pageIcon: page.icon
    });
};
