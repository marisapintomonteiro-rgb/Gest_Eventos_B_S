// routes/dashboardRoutes.js: dashboard e relatório de um evento (/api/events/:eventId/dashboard e /report).
// Todos os perfis entram; o controller só envia os valores financeiros ao Gestor e ao Administrador.

const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

router.get('/dashboard', requireLogin, dashboardController.getDashboard);

// Relatório final (RF27): só Gestor e Administrador (tem valores financeiros)
router.get('/report', requireRole('Gestor'), dashboardController.getReport);

module.exports = router;
