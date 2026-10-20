// routes/eventRoutes.js: endereços da API dos eventos.

const express = require('express');
const eventController = require('../controllers/eventController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/events: listar os eventos da marca (todos os perfis, ex.: para o calendário)
router.get('/', requireLogin, eventController.listEvents);

// POST /api/events: criar um evento (só Gestor e Administrador, US01)
router.post('/', requireRole('Gestor'), eventController.createEvent);

module.exports = router;