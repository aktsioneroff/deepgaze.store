const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

// ===== АВТОРИЗАЦИЯ =====
router.get('/login', portalController.getLogin);
router.post('/login', portalController.login);
router.get('/logout', portalController.logout);

// ===== ГЛАВНАЯ =====
router.get('/', portalController.getIndex);

// ===== ДАШБОРД =====
router.get('/dashboard', portalController.requireAuth, portalController.getDashboard);

// ============================================================
// ===== СОТРУДНИКИ ============================================
// ============================================================
router.get('/employees', portalController.requireAuth, portalController.getEmployees);
router.get('/employees/new', portalController.requireAuth, portalController.getEmployeeForm);
router.get('/employees/:id/edit', portalController.requireAuth, portalController.getEmployeeForm);
router.post('/employees/save', portalController.requireAuth, portalController.saveEmployee);
router.delete('/employees/:id', portalController.requireAuth, portalController.deleteEmployee);

// ============================================================
// ===== ЗАЯВКИ ================================================
// ============================================================
router.get('/requests', portalController.requireAuth, portalController.getRequests);
router.get('/requests/new', portalController.requireAuth, portalController.getRequestForm);
router.get('/requests/:id/edit', portalController.requireAuth, portalController.getRequestForm);
router.post('/requests/save', portalController.requireAuth, portalController.saveRequest);
router.delete('/requests/:id', portalController.requireAuth, portalController.deleteRequest);
router.patch('/requests/:id/status', portalController.requireAuth, portalController.updateRequestStatus);

// ============================================================
// ===== УСЛУГИ ================================================
// ============================================================
router.get('/services', portalController.requireAuth, portalController.getServices);
router.get('/services/new', portalController.requireAuth, portalController.getServiceForm);
router.get('/services/:id/edit', portalController.requireAuth, portalController.getServiceForm);
router.post('/services/save', portalController.requireAuth, portalController.saveService);
router.delete('/services/:id', portalController.requireAuth, portalController.deleteService);

// ============================================================
// ===== ПОРТФОЛИО =============================================
// ============================================================
router.get('/portfolio', portalController.requireAuth, portalController.getPortfolio);
router.get('/portfolio/new', portalController.requireAuth, portalController.getPortfolioForm);
router.get('/portfolio/:id/edit', portalController.requireAuth, portalController.getPortfolioForm);
router.post('/portfolio/save', portalController.requireAuth, portalController.savePortfolio);
router.delete('/portfolio/:id', portalController.requireAuth, portalController.deletePortfolio);

// ============================================================
// ===== ПАРТНЁРЫ ==============================================
// ============================================================
router.get('/partners', portalController.requireAuth, portalController.getPartners);
router.get('/partners/new', portalController.requireAuth, portalController.getPartnerForm);
router.get('/partners/:id/edit', portalController.requireAuth, portalController.getPartnerForm);
router.post('/partners/save', portalController.requireAuth, portalController.savePartner);
router.delete('/partners/:id', portalController.requireAuth, portalController.deletePartner);

// ============================================================
// ===== ФИЛИАЛЫ ===============================================
// ============================================================
router.get('/branches', portalController.requireAuth, portalController.getBranches);
router.get('/branches/new', portalController.requireAuth, portalController.getBranchForm);
router.get('/branches/:id/edit', portalController.requireAuth, portalController.getBranchForm);
router.post('/branches/save', portalController.requireAuth, portalController.saveBranch);
router.delete('/branches/:id', portalController.requireAuth, portalController.deleteBranch);

// ============================================================
// ===== РЕФЕРАЛЫ ==============================================
// ============================================================
router.get('/portal/referrals', portalController.requireAuth, portalController.getReferrals);
router.get('/portal/referrals/new', portalController.requireAuth, portalController.getReferralForm);
router.get('/portal/referrals/:id/edit', portalController.requireAuth, portalController.getReferralForm);
router.post('/portal/referrals/save', portalController.requireAuth, portalController.saveReferral);
router.delete('/portal/referrals/:id', portalController.requireAuth, portalController.deleteReferral);
router.get('/portal/referrals/search', portalController.requireAuth, portalController.searchReferral);
router.post('/portal/referrals/add-bonus', portalController.requireAuth, portalController.addBonus);
router.post('/portal/referrals/subtract-bonus', portalController.requireAuth, portalController.subtractBonus);

// ============================================================
// ===== ЧЕКИ ==================================================
// ============================================================
router.get('/checks', portalController.requireAuth, portalController.getChecks);
router.get('/checks/new', portalController.requireAuth, portalController.getCheckForm);
router.get('/checks/:id/edit', portalController.requireAuth, portalController.getCheckForm);
router.post('/checks/save', portalController.requireAuth, portalController.saveCheck);
router.delete('/checks/:id', portalController.requireAuth, portalController.deleteCheck);

// ===== ЗАГЛУШКА =====
router.get('/portal/*', portalController.requireAuth, portalController.getPortalPlaceholder);

module.exports = router;
