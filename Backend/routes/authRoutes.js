// routes/authRoutes.js: endereços da API de acesso (registo, entrada e saída).

const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// POST /api/auth/register: registar uma marca nova
router.post('/register', authController.registerBrand);

// POST /api/auth/login: iniciar sessão
router.post('/login', authController.login);

// GET /api/auth/me: quem tem a sessão aberta
router.get('/me', authController.getCurrentUser);

// POST /api/auth/logout: terminar sessão
router.post('/logout', authController.logout);

module.exports = router;