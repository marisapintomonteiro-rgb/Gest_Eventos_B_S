// routes/authRoutes.js: endereços da API de acesso (registo, e mais tarde entrada e saída).

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register: registar uma marca nova
router.post('/register', authController.registerBrand);

module.exports = router;