// routes/stockRoutes.js: endereços da API do stock de um evento (/api/events/:eventId/stock).

const express = require('express');
const stockController = require('../controllers/stockController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/stock: stock atual e movimentos (todos os perfis; sem valores em euros)
router.get('/', requireLogin, stockController.getStock);

// POST /api/events/:eventId/stock/movements: registar uma saída
// (o controller confirma o perfil: consumo interno todos; o resto Gestor)
router.post('/movements', requireLogin, requireEditableEvent, stockController.createOutMovement);

// POST /api/events/:eventId/stock/corrections: corrigir o stock (só Gestor e Administrador)
router.post('/corrections', requireRole('Gestor'), requireEditableEvent, stockController.createCorrection);

module.exports = router;
