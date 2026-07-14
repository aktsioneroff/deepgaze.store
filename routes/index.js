const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Главная страница
router.get('/', pageController.getIndex);

// Авторизация
router.get('/login', pageController.getLogin);
router.post('/login', pageController.login);
router.get('/logout', pageController.logout);

// Портал (требуется авторизация) - перенаправляем на portal.js
const portalRoutes = require('./portal');
router.use('/', portalRoutes);

module.exports = router;