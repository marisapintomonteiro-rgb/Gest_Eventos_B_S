// routes/dashboardRoutes.js: dashboard de um evento (/api/events/:eventId/dashboard).
// Todos os perfis entram; o controller só envia os valores financeiros ao Gestor e ao Administrador.

const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/authMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

router.get('/', requireLogin, dashboardController.getDashboard);

module.exports = router;
