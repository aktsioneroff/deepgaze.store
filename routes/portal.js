const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

// ===== ПУБЛИЧНЫЕ API (для сайта) =====
router.get('/api/partners', async (req, res) => {
    try {
        const partners = await portalController.getPartnersData();
        res.json(partners);
    } catch (error) {
        console.error('Ошибка получения партнеров:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/api/portfolio', async (req, res) => {
    try {
        const portfolio = await portalController.getPortfolioData();
        res.json(portfolio);
    } catch (error) {
        console.error('Ошибка получения портфолио:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/api/services', async (req, res) => {
    try {
        const services = await portalController.getServicesData();
        res.json(services);
    } catch (error) {
        console.error('Ошибка получения услуг:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== API ДЛЯ ЗАЯВОК (публичный - с сайта) =====
router.post('/api/requests', async (req, res) => {
    try {
        const { name, phone, date, time, service, serviceId, source } = req.body;
        const requests = await portalController.readData('requests.json');
        
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
        await portalController.writeData('requests.json', requests);
        res.json({ success: true, message: 'Заявка отправлена!', id: newRequest.id });
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ===== API ДЛЯ ПОЛУЧЕНИЯ ЗАНЯТЫХ ВРЕМЕН =====
router.get('/api/occupied-times', async (req, res) => {
    try {
        const { date } = req.query;
        const requests = await portalController.readData('requests.json');
        const occupied = requests
            .filter(r => r.date === date && r.status !== 'Отменена')
            .map(r => r.time);
        res.json({ occupied });
    } catch (error) {
        console.error('Ошибка получения занятых времен:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ПРОВЕРКА СЕССИИ =====
function checkSession(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login?error=Требуется авторизация');
    }
}

// ===== ОБЕРТКА ДЛЯ ASYNC =====
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===== ДАШБОРД =====
router.get('/dashboard', checkSession, asyncHandler(portalController.getDashboard));

// ===== ЗАЯВКИ =====
router.get('/requests', checkSession, asyncHandler(portalController.getRequests));
router.get('/requests/add', checkSession, asyncHandler(portalController.getRequestForm));
router.get('/requests/edit/:id', checkSession, asyncHandler(portalController.getRequestForm));
router.post('/requests/save', checkSession, asyncHandler(portalController.saveRequest));
router.delete('/requests/delete/:id', checkSession, asyncHandler(portalController.deleteRequest));
router.post('/requests/status/:id', checkSession, asyncHandler(portalController.updateRequestStatus));

// ===== РЕФЕРАЛЫ =====
router.get('/portal/referrals', checkSession, asyncHandler(portalController.getReferrals));
router.get('/portal/referrals/add', checkSession, asyncHandler(portalController.getReferralForm));
router.get('/portal/referrals/edit/:id', checkSession, asyncHandler(portalController.getReferralForm));
router.post('/portal/referrals/save', checkSession, asyncHandler(portalController.saveReferral));
router.delete('/portal/referrals/delete/:id', checkSession, asyncHandler(portalController.deleteReferral));
router.get('/api/referrals/search', checkSession, asyncHandler(portalController.searchReferral));
router.post('/api/referrals/add-bonus', checkSession, asyncHandler(portalController.addBonus));
router.post('/api/referrals/subtract-bonus', checkSession, asyncHandler(portalController.subtractBonus));

// ===== ФИЛИАЛЫ =====
router.get('/branches', checkSession, asyncHandler(portalController.getBranches));
router.get('/branches/add', checkSession, asyncHandler(portalController.getBranchForm));
router.get('/branches/edit/:id', checkSession, asyncHandler(portalController.getBranchForm));
router.post('/branches/save', checkSession, asyncHandler(portalController.saveBranch));
router.delete('/branches/delete/:id', checkSession, asyncHandler(portalController.deleteBranch));

// ===== СОТРУДНИКИ =====
router.get('/employees', checkSession, asyncHandler(portalController.getEmployees));
router.get('/employees/add', checkSession, asyncHandler(portalController.getEmployeeForm));
router.get('/employees/edit/:id', checkSession, asyncHandler(portalController.getEmployeeForm));
router.post('/employees/save', checkSession, asyncHandler(portalController.saveEmployee));
router.delete('/employees/delete/:id', checkSession, asyncHandler(portalController.deleteEmployee));

// ===== ПАРТНЁРЫ =====
router.get('/partners', checkSession, asyncHandler(portalController.getPartners));
router.get('/partners/add', checkSession, asyncHandler(portalController.getPartnerForm));
router.get('/partners/edit/:id', checkSession, asyncHandler(portalController.getPartnerForm));
router.post('/partners/save', checkSession, asyncHandler(portalController.savePartner));
router.delete('/partners/delete/:id', checkSession, asyncHandler(portalController.deletePartner));

// ===== ПОРТФОЛИО =====
router.get('/portfolio', checkSession, asyncHandler(portalController.getPortfolio));
router.get('/portfolio/add', checkSession, asyncHandler(portalController.getPortfolioForm));
router.get('/portfolio/edit/:id', checkSession, asyncHandler(portalController.getPortfolioForm));
router.post('/portfolio/save', checkSession, asyncHandler(portalController.savePortfolio));
router.delete('/portfolio/delete/:id', checkSession, asyncHandler(portalController.deletePortfolio));

// ===== УСЛУГИ =====
router.get('/services', checkSession, asyncHandler(portalController.getServices));
router.get('/services/add', checkSession, asyncHandler(portalController.getServiceForm));
router.get('/services/edit/:id', checkSession, asyncHandler(portalController.getServiceForm));
router.post('/services/save', checkSession, asyncHandler(portalController.saveService));
router.delete('/services/delete/:id', checkSession, asyncHandler(portalController.deleteService));

// ===== ЧЕКИ =====
router.get('/checks', checkSession, asyncHandler(portalController.getChecks));
router.get('/checks/add', checkSession, asyncHandler(portalController.getCheckForm));
router.get('/checks/edit/:id', checkSession, asyncHandler(portalController.getCheckForm));
router.get('/checks/view/:id', checkSession, asyncHandler(portalController.viewCheck));
router.post('/checks/save', checkSession, asyncHandler(portalController.saveCheck));
router.delete('/checks/delete/:id', checkSession, asyncHandler(portalController.deleteCheck));
router.get('/checks/pdf/:id', checkSession, asyncHandler(portalController.generatePDF));

// ===== API ПРОВЕРКИ СЕССИИ =====
router.get('/api/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, error: 'Не авторизован' });
    }
});

module.exports = router;
