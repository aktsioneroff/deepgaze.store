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
    'admin': { password: 'admin123', name: 'Администратор', role: 'admin' }
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

function getUserPermissions(user) {
    if (!user) return null;
    if (user.role === 'admin') {
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
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('pages/login', {
        title: 'Вход в портал — DEEP GAZE',
        error: req.query.error || null
    });
};

exports.login = (req, res) => {
    const { login, password } = req.body;
    
    if (users[login] && users[login].password === password) {
        req.session.user = {
            login: login,
            name: users[login].name,
            role: users[login].role
        };
        req.session.save(() => {
            res.redirect('/dashboard');
        });
        return;
    }
    
    const employees = loadEmployees();
    const employee = employees.find(e => e.login === login && e.password === password);
    if (employee) {
        req.session.user = {
            login: employee.login,
            name: employee.fullName,
            role: 'employee',
            position: employee.position,
            employeeId: employee.id,
            branchId: employee.branchId
        };
        req.session.save(() => {
            res.redirect('/dashboard');
        });
        return;
    }
    
    res.redirect('/login?error=Неверный логин или пароль');
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

exports.requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login?error=Требуется авторизация');
    }
};

exports.getDashboard = (req, res) => {
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
    const permissions = getUserPermissions(req.session.user);
    res.render('pages/portal-placeholder', {
        title: page.title + ' — DEEP GAZE',
        user: req.session.user,
        activePage: req.path,
        pageTitle: page.title,
        pageIcon: page.icon,
        permissions: permissions
    });
};
