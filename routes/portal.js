const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

// ===== ПРОВЕРКА СЕССИИ =====
function checkSession(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login?error=Требуется авторизация');
    }
}

// ===== ОБЕРТКА ДЛЯ ASYNC ФУНКЦИЙ =====
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

// ===== API СТАТУС S3 =====
router.get('/api/s3-status', (req, res) => {
    try {
        const s3 = require('../config/s3');
        res.json({
            connected: s3.s3Connected || false,
            timestamp: new Date().toISOString(),
            bucket: s3.BUCKET_NAME || null,
            endpoint: s3.s3Config ? s3.s3Config.endpoint : null
        });
    } catch (error) {
        res.json({
            connected: false,
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// ===== API ПРОВЕРКИ СЕССИИ =====
router.get('/api/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, error: 'Не авторизован' });
    }
});

module.exports = router;
