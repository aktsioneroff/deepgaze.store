const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const pageController = require('../controllers/pageController');
const fs = require('fs');
const path = require('path');

const PARTNERS_FILE = path.join(__dirname, '../data/partners.json');
const PORTFOLIO_FILE = path.join(__dirname, '../data/portfolio.json');
const SERVICES_FILE = path.join(__dirname, '../data/services.json');
const REQUESTS_FILE = path.join(__dirname, '../data/requests.json');
const EMPLOYEES_FILE = path.join(__dirname, '../data/employees.json');
const BRANCHES_FILE = path.join(__dirname, '../data/branches.json');

function readData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Ошибка чтения файла:', error);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Ошибка записи файла:', error);
        return false;
    }
}

// ===== ПУБЛИЧНЫЕ API =====
router.get('/api/partners', (req, res) => {
    const partners = readData(PARTNERS_FILE);
    res.json(partners);
});

router.get('/api/portfolio', (req, res) => {
    const portfolio = readData(PORTFOLIO_FILE);
    res.json(portfolio);
});

router.get('/api/services', (req, res) => {
    const services = readData(SERVICES_FILE);
    res.json(services);
});

router.post('/api/requests', (req, res) => {
    const { name, phone, date, time, service, serviceId, source } = req.body;
    const requests = readData(REQUESTS_FILE);
    
    const existing = requests.find(r => r.date === date && r.time === time && r.status !== 'Отменена');
    if (existing) {
        return res.status(400).json({ 
            success: false, 
            message: 'Это время уже занято. Пожалуйста, выберите другое время.' 
        });
    }
    
    const newRequest = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: name || 'Клиент',
        phone: phone || '',
        date: date || new Date().toISOString().split('T')[0],
        time: time || '12:00',
        service: service || 'Не указана',
        serviceId: serviceId || '',
        source: source || 'Сайт',
        status: 'Новая',
        createdAt: new Date().toISOString(),
        createdBy: 'Сайт',
        branchId: ''
    };
    
    requests.push(newRequest);
    writeData(REQUESTS_FILE, requests);
    res.json({ success: true, message: 'Заявка отправлена!', id: newRequest.id });
});

router.get('/api/occupied-times', (req, res) => {
    const { date } = req.query;
    const requests = readData(REQUESTS_FILE);
    const occupied = requests
        .filter(r => r.date === date && r.status !== 'Отменена')
        .map(r => r.time);
    res.json({ occupied });
});

// ===== API ДЛЯ РЕФЕРАЛОВ =====
router.get('/api/referrals/search', pageController.checkPermission('referrals', 'view'), portalController.searchReferral);
router.post('/api/referrals/add-bonus', pageController.checkPermission('referrals', 'edit'), portalController.addBonus);
router.post('/api/referrals/subtract-bonus', pageController.checkPermission('referrals', 'edit'), portalController.subtractBonus);

// ===== ПРОВЕРКА СЕССИИ =====
function checkSession(req, res, next) {
    if (!req.session) {
        if (req.xhr || req.headers['accept'] === 'application/json') {
            return res.status(401).json({ success: false, error: 'Сессия истекла', redirect: '/login' });
        }
        return res.redirect('/login?error=Сессия истекла');
    }
    
    if (!req.session.user) {
        if (req.xhr || req.headers['accept'] === 'application/json') {
            return res.status(401).json({ success: false, error: 'Требуется авторизация', redirect: '/login' });
        }
        return res.redirect('/login?error=Требуется авторизация');
    }
    
    next();
}

// ===== ДАШБОРД =====
router.get('/dashboard', checkSession, portalController.getDashboard);

// ===== ЗАЯВКИ =====
router.get('/requests', checkSession, pageController.checkPermission('requests', 'view'), portalController.getRequests);
router.get('/requests/add', checkSession, pageController.checkPermission('requests', 'create'), portalController.getRequestForm);
router.get('/requests/edit/:id', checkSession, pageController.checkPermission('requests', 'edit'), portalController.getRequestForm);
router.post('/requests/save', checkSession, pageController.checkPermission('requests', 'edit'), portalController.saveRequest);
router.delete('/requests/delete/:id', checkSession, pageController.checkPermission('requests', 'delete'), portalController.deleteRequest);
router.post('/requests/status/:id', checkSession, pageController.checkPermission('requests', 'edit'), portalController.updateRequestStatus);

// ===== УСЛУГИ =====
router.get('/services', checkSession, pageController.checkPermission('services', 'view'), portalController.getServices);
router.get('/services/add', checkSession, pageController.checkPermission('services', 'create'), portalController.getServiceForm);
router.get('/services/edit/:id', checkSession, pageController.checkPermission('services', 'edit'), portalController.getServiceForm);
router.post('/services/save', checkSession, pageController.checkPermission('services', 'edit'), portalController.saveService);
router.delete('/services/delete/:id', checkSession, pageController.checkPermission('services', 'delete'), portalController.deleteService);

// ===== ПОРТФОЛИО =====
router.get('/portfolio', checkSession, pageController.checkPermission('portfolio', 'view'), portalController.getPortfolio);
router.get('/portfolio/add', checkSession, pageController.checkPermission('portfolio', 'create'), portalController.getPortfolioForm);
router.get('/portfolio/edit/:id', checkSession, pageController.checkPermission('portfolio', 'edit'), portalController.getPortfolioForm);
router.post('/portfolio/save', checkSession, pageController.checkPermission('portfolio', 'edit'), portalController.savePortfolio);
router.delete('/portfolio/delete/:id', checkSession, pageController.checkPermission('portfolio', 'delete'), portalController.deletePortfolio);

// ===== ПАРТНЁРЫ =====
router.get('/partners', checkSession, pageController.checkPermission('partners', 'view'), portalController.getPartners);
router.get('/partners/add', checkSession, pageController.checkPermission('partners', 'create'), portalController.getPartnerForm);
router.get('/partners/edit/:id', checkSession, pageController.checkPermission('partners', 'edit'), portalController.getPartnerForm);
router.post('/partners/save', checkSession, pageController.checkPermission('partners', 'edit'), portalController.savePartner);
router.delete('/partners/delete/:id', checkSession, pageController.checkPermission('partners', 'delete'), portalController.deletePartner);

// ===== ФИЛИАЛЫ =====
router.get('/branches', checkSession, pageController.checkPermission('branches', 'view'), portalController.getBranches);
router.get('/branches/add', checkSession, pageController.checkPermission('branches', 'create'), portalController.getBranchForm);
router.get('/branches/edit/:id', checkSession, pageController.checkPermission('branches', 'edit'), portalController.getBranchForm);
router.post('/branches/save', checkSession, pageController.checkPermission('branches', 'edit'), portalController.saveBranch);
router.delete('/branches/delete/:id', checkSession, pageController.checkPermission('branches', 'delete'), portalController.deleteBranch);

// ===== СОТРУДНИКИ =====
router.get('/employees', checkSession, pageController.checkPermission('employees', 'view'), portalController.getEmployees);
router.get('/employees/add', checkSession, pageController.checkPermission('employees', 'create'), portalController.getEmployeeForm);
router.get('/employees/edit/:id', checkSession, pageController.checkPermission('employees', 'edit'), portalController.getEmployeeForm);
router.post('/employees/save', checkSession, pageController.checkPermission('employees', 'edit'), portalController.saveEmployee);
router.delete('/employees/delete/:id', checkSession, pageController.checkPermission('employees', 'delete'), portalController.deleteEmployee);

// ===== РЕФЕРАЛЫ =====
router.get('/portal/referrals', checkSession, pageController.checkPermission('referrals', 'view'), portalController.getReferrals);
router.get('/portal/referrals/add', checkSession, pageController.checkPermission('referrals', 'create'), portalController.getReferralForm);
router.get('/portal/referrals/edit/:id', checkSession, pageController.checkPermission('referrals', 'edit'), portalController.getReferralForm);
router.post('/portal/referrals/save', checkSession, pageController.checkPermission('referrals', 'edit'), portalController.saveReferral);
router.delete('/portal/referrals/delete/:id', checkSession, pageController.checkPermission('referrals', 'delete'), portalController.deleteReferral);

module.exports = router;