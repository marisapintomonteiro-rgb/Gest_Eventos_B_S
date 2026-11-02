// routes/eventRoutes.js: endereços da API dos eventos.

const express = require('express');
const eventController = require('../controllers/eventController');
const calendarController = require('../controllers/calendarController');
const forecastController = require('../controllers/forecastController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

const router = express.Router();

// GET /api/events: listar os eventos da marca (todos os perfis, ex.: para o calendário)
router.get('/', requireLogin, eventController.listEvents);

// POST /api/events: criar um evento (só Gestor e Administrador, US01)
router.post('/', requireRole('Gestor'), eventController.createEvent);

// GET /api/events/calendar: dias de todos os eventos, com o desempenho (RF06, RF32)
router.get('/calendar', requireLogin, calendarController.getCalendar);

// GET /api/events/:eventId/forecast?margin=10: previsão de compras (RF13)
router.get('/:eventId/forecast', requireRole('Gestor'), forecastController.getForecast);

// PUT /api/events/:eventId/previous: definir a edição anterior do evento (RF13)
router.put('/:eventId/previous', requireRole('Gestor'), requireEditableEvent, forecastController.setPreviousEvent);

// GET /api/events/:eventId/days: dias do evento (todos os perfis, ex.: para escolher o dia das vendas)
router.get('/:eventId/days', requireLogin, eventController.listDays);

// POST /api/events/:eventId/days/:dayId/close: fechar o dia (RF19)
router.post('/:eventId/days/:dayId/close', requireRole('Gestor'), requireEditableEvent, eventController.closeDay);

// POST /api/events/:eventId/days/:dayId/reopen: reabrir o dia para corrigir
router.post('/:eventId/days/:dayId/reopen', requireRole('Gestor'), requireEditableEvent, eventController.reopenDay);

// POST /api/events/:eventId/close: encerrar o evento (RF25)
router.post('/:eventId/close', requireRole('Gestor'), requireEditableEvent, eventController.closeEvent);

module.exports = router;