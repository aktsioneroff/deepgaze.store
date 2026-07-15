const fs = require('fs');
const path = require('path');

// ===== ПРЯМОЕ ПОДКЛЮЧЕНИЕ S3 =====
const { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Config = {
    endpoint: 'https://s3.twcstorage.ru',
    region: 'ru-1',
    credentials: {
        accessKeyId: 'WH5JV70A76ML0WY9VWJM',
        secretAccessKey: 'EtN37sHNRkLs5dPgJzkB2TQFUW8mSE81gDIFe8DP'
    },
    forcePathStyle: true
};

const BUCKET_NAME = 'b84d36c2-5e58-406e-9d3d-5754fe0dda39';
const s3Client = new S3Client(s3Config);

async function readS3(key) {
    try {
        const result = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        const body = await result.Body.transformToString();
        return JSON.parse(body);
    } catch (error) {
        if (error.name === 'NoSuchKey') return null;
        return null;
    }
}

async function writeS3(key, data) {
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        }));
        return true;
    } catch (error) {
        console.error('Ошибка записи S3:', error.message);
        return false;
    }
}

async function readData(fileName) {
    const data = await readS3(`data/${fileName}`);
    if (data) {
        console.log(`📖 Загружено: ${fileName}`);
        return data;
    }
    console.log(`📄 Новый файл: ${fileName}`);
    return [];
}

async function writeData(fileName, data) {
    const result = await writeS3(`data/${fileName}`, data);
    if (result) {
        console.log(`💾 Сохранено: ${fileName}`);
    }
    return result;
}

// ===== КОНСТАНТЫ =====
const BRANCHES_FILE = 'branches.json';
const EMPLOYEES_FILE = 'employees.json';
const PARTNERS_FILE = 'partners.json';
const PORTFOLIO_FILE = 'portfolio.json';
const SERVICES_FILE = 'services.json';
const REQUESTS_FILE = 'requests.json';
const REFERRALS_FILE = 'referrals.json';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function shortId(id) {
    return id.substr(0, 8);
}

// ===== ПРАВА ДОСТУПА =====
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
    
    return rolePermissions[user.position] || null;
}

// ===== ДАШБОРД =====
exports.getDashboard = async (req, res) => {
    const requests = await readData(REQUESTS_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    let userBranchId = null;
    let filteredRequests = requests;
    
    if (req.session.user.role !== 'admin' && req.session.user.branchId) {
        userBranchId = req.session.user.branchId;
        filteredRequests = requests.filter(r => r.branchId === userBranchId);
    }
    
    const newCount = filteredRequests.filter(r => r.status === 'Новая').length;
    const activeCount = filteredRequests.filter(r => r.status === 'В обработке').length;
    const completedCount = filteredRequests.filter(r => r.status === 'Завершена').length;
    
    const recentRequests = filteredRequests
        .filter(r => r.status === 'Новая' || r.status === 'В обработке')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    const services = await readData(SERVICES_FILE);
    const branches = await readData(BRANCHES_FILE);
    
    const recentWithInfo = recentRequests.map(req => {
        const service = services.find(s => s.id === req.serviceId);
        const branch = branches.find(b => b.id === req.branchId);
        return {
            ...req,
            serviceName: service ? service.name : req.service || 'Не указана',
            branchName: branch ? branch.address : 'Не указан'
        };
    });
    
    res.render('pages/dashboard', {
        title: 'Панель управления — DEEP GAZE',
        user: req.session.user,
        activePage: 'dashboard',
        permissions: permissions,
        newCount: newCount,
        activeCount: activeCount,
        completedCount: completedCount,
        recentRequests: recentWithInfo,
        shortId: shortId,
        isAdmin: req.session.user.role === 'admin'
    });
};

// ===== ЗАГЛУШКА =====
exports.getPlaceholder = (req, res) => {
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

// ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
exports.getReferrals = async (req, res) => {
    const referrals = await readData(REFERRALS_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    res.render('pages/referrals/index', {
        title: 'Реферальная система — DEEP GAZE',
        user: req.session.user,
        activePage: '/portal/referrals',
        referrals: referrals,
        shortId: shortId,
        permissions: permissions
    });
};

exports.getReferralForm = async (req, res) => {
    const id = req.params.id;
    let referral = null;
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const referrals = await readData(REFERRALS_FILE);
        referral = referrals.find(r => r.id === id);
    }
    
    res.render('pages/referrals/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' клиента — DEEP GAZE',
        user: req.session.user,
        activePage: '/portal/referrals',
        referral: referral,
        isEdit: !!id,
        permissions: permissions
    });
};

exports.saveReferral = async (req, res) => {
    const { id, name, phone, bonus } = req.body;
    const referrals = await readData(REFERRALS_FILE);
    
    if (id) {
        const index = referrals.findIndex(r => r.id === id);
        if (index !== -1) {
            referrals[index] = { 
                ...referrals[index], 
                name, 
                phone,
                bonus: parseInt(bonus) || 0
            };
        }
    } else {
        referrals.push({
            id: generateId(),
            name: name || 'Клиент',
            phone: phone || '',
            bonus: parseInt(bonus) || 0,
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(REFERRALS_FILE, referrals);
    res.redirect('/portal/referrals');
};

exports.deleteReferral = async (req, res) => {
    const id = req.params.id;
    const referrals = await readData(REFERRALS_FILE);
    const filtered = referrals.filter(r => r.id !== id);
    await writeData(REFERRALS_FILE, filtered);
    res.json({ success: true });
};

exports.searchReferral = async (req, res) => {
    const { phone } = req.query;
    const referrals = await readData(REFERRALS_FILE);
    
    if (!phone) {
        return res.json([]);
    }
    
    const results = referrals.filter(r => 
        r.phone && r.phone.includes(phone)
    );
    
    res.json(results);
};

exports.addBonus = async (req, res) => {
    const { id, orderAmount } = req.body;
    const referrals = await readData(REFERRALS_FILE);
    const index = referrals.findIndex(r => r.id === id);
    
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const bonusAmount = Math.round(parseFloat(orderAmount) * 0.1);
    
    referrals[index].bonus = (referrals[index].bonus || 0) + bonusAmount;
    referrals[index].lastTransaction = {
        type: 'add',
        amount: bonusAmount,
        orderAmount: parseFloat(orderAmount),
        date: new Date().toISOString()
    };
    
    await writeData(REFERRALS_FILE, referrals);
    res.json({ 
        success: true, 
        newBonus: referrals[index].bonus,
        addedBonus: bonusAmount
    });
};

exports.subtractBonus = async (req, res) => {
    const { id, orderAmount } = req.body;
    const referrals = await readData(REFERRALS_FILE);
    const index = referrals.findIndex(r => r.id === id);
    
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const maxBonus = Math.round(parseFloat(orderAmount) * 0.3);
    const currentBonus = referrals[index].bonus || 0;
    const bonusToSubtract = Math.min(currentBonus, maxBonus);
    
    if (bonusToSubtract === 0) {
        return res.json({ 
            success: false, 
            error: 'Недостаточно бонусов или сумма заказа слишком мала',
            maxBonus: maxBonus,
            currentBonus: currentBonus
        });
    }
    
    referrals[index].bonus = currentBonus - bonusToSubtract;
    referrals[index].lastTransaction = {
        type: 'subtract',
        amount: bonusToSubtract,
        orderAmount: parseFloat(orderAmount),
        date: new Date().toISOString()
    };
    
    await writeData(REFERRALS_FILE, referrals);
    res.json({ 
        success: true, 
        newBonus: referrals[index].bonus,
        subtractedBonus: bonusToSubtract
    });
};

// ===== ЗАЯВКИ =====
exports.getRequests = async (req, res) => {
    const requests = await readData(REQUESTS_FILE);
    const employees = await readData(EMPLOYEES_FILE);
    const services = await readData(SERVICES_FILE);
    const branches = await readData(BRANCHES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    const filterStatus = req.query.status || 'all';
    
    let userBranchId = null;
    if (req.session.user.role !== 'admin') {
        const employee = employees.find(e => e.id === req.session.user.employeeId);
        userBranchId = employee ? employee.branchId : null;
    }
    
    let filteredRequests = requests;
    if (userBranchId) {
        filteredRequests = requests.filter(r => r.branchId === userBranchId);
    }
    
    if (filterStatus !== 'all') {
        filteredRequests = filteredRequests.filter(r => r.status === filterStatus);
    }
    
    filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const requestsWithInfo = filteredRequests.map(req => {
        const service = services.find(s => s.id === req.serviceId);
        const branch = branches.find(b => b.id === req.branchId);
        return {
            ...req,
            serviceName: service ? service.name : req.service || 'Не указана',
            branchName: branch ? branch.address : 'Не указан'
        };
    });
    
    const statusCounts = {
        all: requests.length,
        'Новая': requests.filter(r => r.status === 'Новая').length,
        'В обработке': requests.filter(r => r.status === 'В обработке').length,
        'Завершена': requests.filter(r => r.status === 'Завершена').length,
        'Отменена': requests.filter(r => r.status === 'Отменена').length
    };
    
    res.render('pages/requests/index', {
        title: 'Заявки — DEEP GAZE',
        user: req.session.user,
        activePage: '/requests',
        requests: requestsWithInfo,
        shortId: shortId,
        isAdmin: req.session.user.role === 'admin',
        filterStatus: filterStatus,
        statusCounts: statusCounts,
        permissions: permissions
    });
};

exports.getRequestForm = async (req, res) => {
    const id = req.params.id;
    let request = null;
    const services = await readData(SERVICES_FILE);
    const employees = await readData(EMPLOYEES_FILE);
    const branches = await readData(BRANCHES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    let userBranchId = null;
    let userBranch = null;
    if (req.session.user.role !== 'admin') {
        const employee = employees.find(e => e.id === req.session.user.employeeId);
        userBranchId = employee ? employee.branchId : null;
        userBranch = branches.find(b => b.id === userBranchId);
    }
    
    if (id) {
        const requests = await readData(REQUESTS_FILE);
        request = requests.find(r => r.id === id);
    }
    
    let availableBranches = [];
    if (req.session.user.role === 'admin') {
        availableBranches = branches;
    } else if (userBranch) {
        availableBranches = [userBranch];
    }
    
    res.render('pages/requests/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' заявки — DEEP GAZE',
        user: req.session.user,
        activePage: '/requests',
        request: request,
        services: services,
        branches: availableBranches,
        isEdit: !!id,
        isAdmin: req.session.user.role === 'admin',
        userBranchId: userBranchId,
        permissions: permissions
    });
};

exports.saveRequest = async (req, res) => {
    const { id, name, phone, date, time, serviceId, branchId, source, status } = req.body;
    const requests = await readData(REQUESTS_FILE);
    const employees = await readData(EMPLOYEES_FILE);
    
    let employeeBranchId = null;
    if (req.session.user.role !== 'admin') {
        const employee = employees.find(e => e.id === req.session.user.employeeId);
        employeeBranchId = employee ? employee.branchId : null;
    }
    
    let finalBranchId = branchId || employeeBranchId;
    
    if (id) {
        const index = requests.findIndex(r => r.id === id);
        if (index !== -1) {
            requests[index] = { 
                ...requests[index], 
                name, 
                phone, 
                date, 
                time, 
                serviceId,
                branchId: finalBranchId,
                source: source || requests[index].source,
                status: status || requests[index].status
            };
        }
    } else {
        const newRequest = {
            id: generateId(),
            name: name || 'Клиент',
            phone: phone || '',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '12:00',
            serviceId: serviceId || '',
            service: '',
            branchId: finalBranchId || '',
            source: source || 'Менеджер',
            status: status || 'Новая',
            createdAt: new Date().toISOString(),
            createdBy: req.session.user.name || 'Менеджер'
        };
        requests.push(newRequest);
    }
    
    await writeData(REQUESTS_FILE, requests);
    res.redirect('/requests');
};

exports.deleteRequest = async (req, res) => {
    const id = req.params.id;
    const requests = await readData(REQUESTS_FILE);
    const filtered = requests.filter(r => r.id !== id);
    await writeData(REQUESTS_FILE, filtered);
    res.json({ success: true });
};

exports.updateRequestStatus = async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const requests = await readData(REQUESTS_FILE);
    const index = requests.findIndex(r => r.id === id);
    
    if (index !== -1) {
        requests[index].status = status;
        await writeData(REQUESTS_FILE, requests);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }
};

// ===== ФИЛИАЛЫ =====
exports.getBranches = async (req, res) => {
    const branches = await readData(BRANCHES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    res.render('pages/branches/index', {
        title: 'Филиалы — DEEP GAZE',
        user: req.session.user,
        activePage: '/branches',
        branches: branches,
        shortId: shortId,
        permissions: permissions
    });
};

exports.getBranchForm = async (req, res) => {
    const id = req.params.id;
    let branch = null;
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const branches = await readData(BRANCHES_FILE);
        branch = branches.find(b => b.id === id);
    }
    
    res.render('pages/branches/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' филиала — DEEP GAZE',
        user: req.session.user,
        activePage: '/branches',
        branch: branch,
        isEdit: !!id,
        permissions: permissions
    });
};

exports.saveBranch = async (req, res) => {
    const { id, city, address, rent, rentDate } = req.body;
    const branches = await readData(BRANCHES_FILE);
    
    if (id) {
        const index = branches.findIndex(b => b.id === id);
        if (index !== -1) {
            branches[index] = { ...branches[index], city, address, rent, rentDate };
        }
    } else {
        branches.push({
            id: generateId(),
            city,
            address,
            rent: parseFloat(rent) || 0,
            rentDate: rentDate || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(BRANCHES_FILE, branches);
    res.redirect('/branches');
};

exports.deleteBranch = async (req, res) => {
    const id = req.params.id;
    const branches = await readData(BRANCHES_FILE);
    const filtered = branches.filter(b => b.id !== id);
    await writeData(BRANCHES_FILE, filtered);
    res.json({ success: true });
};

// ===== СОТРУДНИКИ =====
exports.getEmployees = async (req, res) => {
    const employees = await readData(EMPLOYEES_FILE);
    const branches = await readData(BRANCHES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    const employeesWithBranch = employees.map(emp => {
        const branch = branches.find(b => b.id === emp.branchId);
        return { ...emp, branchName: branch ? branch.address : 'Не указан' };
    });
    
    res.render('pages/employees/index', {
        title: 'Сотрудники — DEEP GAZE',
        user: req.session.user,
        activePage: '/employees',
        employees: employeesWithBranch,
        branches: branches,
        shortId: shortId,
        permissions: permissions,
        isAdmin: req.session.user.role === 'admin'
    });
};

exports.getEmployeeForm = async (req, res) => {
    const id = req.params.id;
    let employee = null;
    const branches = await readData(BRANCHES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const employees = await readData(EMPLOYEES_FILE);
        employee = employees.find(e => e.id === id);
    }
    
    res.render('pages/employees/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' сотрудника — DEEP GAZE',
        user: req.session.user,
        activePage: '/employees',
        employee: employee,
        branches: branches,
        isEdit: !!id,
        permissions: permissions,
        isAdmin: req.session.user.role === 'admin'
    });
};

exports.saveEmployee = async (req, res) => {
    const { id, fullName, birthDate, position, branchId, phone, login, password } = req.body;
    const employees = await readData(EMPLOYEES_FILE);
    const isAdmin = req.session.user.role === 'admin';
    
    if (position === 'Генеральный директор' && !isAdmin) {
        return res.status(403).send('Только администратор может назначить генерального директора');
    }
    
    if (id) {
        const index = employees.findIndex(e => e.id === id);
        if (index !== -1) {
            employees[index] = { 
                ...employees[index], 
                fullName, 
                birthDate, 
                position, 
                branchId,
                phone,
                login: login || employees[index].login,
                password: password || employees[index].password
            };
        }
    } else {
        employees.push({
            id: generateId(),
            fullName,
            birthDate,
            position,
            branchId: branchId || '',
            phone: phone || '',
            login: login || '',
            password: password || '',
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(EMPLOYEES_FILE, employees);
    res.redirect('/employees');
};

exports.deleteEmployee = async (req, res) => {
    const id = req.params.id;
    const employees = await readData(EMPLOYEES_FILE);
    const filtered = employees.filter(e => e.id !== id);
    await writeData(EMPLOYEES_FILE, filtered);
    res.json({ success: true });
};

// ===== ПАРТНЁРЫ =====
exports.getPartners = async (req, res) => {
    const partners = await readData(PARTNERS_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    res.render('pages/partners/index', {
        title: 'Партнёры — DEEP GAZE',
        user: req.session.user,
        activePage: '/partners',
        partners: partners,
        shortId: shortId,
        permissions: permissions
    });
};

exports.getPartnerForm = async (req, res) => {
    const id = req.params.id;
    let partner = null;
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const partners = await readData(PARTNERS_FILE);
        partner = partners.find(p => p.id === id);
    }
    
    res.render('pages/partners/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' партнёра — DEEP GAZE',
        user: req.session.user,
        activePage: '/partners',
        partner: partner,
        isEdit: !!id,
        permissions: permissions
    });
};

exports.savePartner = async (req, res) => {
    const { id, name, logo } = req.body;
    const partners = await readData(PARTNERS_FILE);
    
    if (id) {
        const index = partners.findIndex(p => p.id === id);
        if (index !== -1) {
            partners[index] = { ...partners[index], name, logo };
        }
    } else {
        partners.push({
            id: generateId(),
            name,
            logo: logo || '',
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(PARTNERS_FILE, partners);
    res.redirect('/partners');
};

exports.deletePartner = async (req, res) => {
    const id = req.params.id;
    const partners = await readData(PARTNERS_FILE);
    const filtered = partners.filter(p => p.id !== id);
    await writeData(PARTNERS_FILE, filtered);
    res.json({ success: true });
};

// ===== ПОРТФОЛИО =====
exports.getPortfolio = async (req, res) => {
    const portfolio = await readData(PORTFOLIO_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    res.render('pages/portfolio/index', {
        title: 'Портфолио — DEEP GAZE',
        user: req.session.user,
        activePage: '/portfolio',
        portfolio: portfolio,
        shortId: shortId,
        permissions: permissions
    });
};

exports.getPortfolioForm = async (req, res) => {
    const id = req.params.id;
    let item = null;
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const portfolio = await readData(PORTFOLIO_FILE);
        item = portfolio.find(p => p.id === id);
    }
    
    res.render('pages/portfolio/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' работы — DEEP GAZE',
        user: req.session.user,
        activePage: '/portfolio',
        item: item,
        isEdit: !!id,
        permissions: permissions
    });
};

exports.savePortfolio = async (req, res) => {
    const { id, image } = req.body;
    const portfolio = await readData(PORTFOLIO_FILE);
    
    if (id) {
        const index = portfolio.findIndex(p => p.id === id);
        if (index !== -1) {
            portfolio[index] = { ...portfolio[index], image };
        }
    } else {
        portfolio.push({
            id: generateId(),
            image: image || '',
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(PORTFOLIO_FILE, portfolio);
    res.redirect('/portfolio');
};

exports.deletePortfolio = async (req, res) => {
    const id = req.params.id;
    const portfolio = await readData(PORTFOLIO_FILE);
    const filtered = portfolio.filter(p => p.id !== id);
    await writeData(PORTFOLIO_FILE, filtered);
    res.json({ success: true });
};

// ===== УСЛУГИ =====
exports.getServices = async (req, res) => {
    const services = await readData(SERVICES_FILE);
    const permissions = getUserPermissions(req.session.user);
    
    res.render('pages/services/index', {
        title: 'Услуги — DEEP GAZE',
        user: req.session.user,
        activePage: '/services',
        services: services,
        shortId: shortId,
        permissions: permissions
    });
};

exports.getServiceForm = async (req, res) => {
    const id = req.params.id;
    let service = null;
    const permissions = getUserPermissions(req.session.user);
    
    if (id) {
        const services = await readData(SERVICES_FILE);
        service = services.find(s => s.id === id);
    }
    
    res.render('pages/services/form', {
        title: (id ? 'Редактирование' : 'Добавление') + ' услуги — DEEP GAZE',
        user: req.session.user,
        activePage: '/services',
        service: service,
        isEdit: !!id,
        permissions: permissions
    });
};

exports.saveService = async (req, res) => {
    const { id, name, price, description, image } = req.body;
    const services = await readData(SERVICES_FILE);
    
    if (id) {
        const index = services.findIndex(s => s.id === id);
        if (index !== -1) {
            services[index] = { ...services[index], name, price, description, image };
        }
    } else {
        services.push({
            id: generateId(),
            name,
            price: price || '0 ₽',
            description: description || '',
            image: image || '',
            createdAt: new Date().toISOString()
        });
    }
    
    await writeData(SERVICES_FILE, services);
    res.redirect('/services');
};

exports.deleteService = async (req, res) => {
    const id = req.params.id;
    const services = await readData(SERVICES_FILE);
    const filtered = services.filter(s => s.id !== id);
    await writeData(SERVICES_FILE, filtered);
    res.json({ success: true });
};
