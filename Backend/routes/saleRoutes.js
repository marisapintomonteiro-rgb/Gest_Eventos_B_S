// routes/saleRoutes.js: endereços da API das vendas de um evento (/api/events/:eventId/sales).
// Todos os perfis registam vendas (RF14) e consultam a faturação do dia (RF30).

const express = require('express');
const saleController = require('../controllers/saleController');
const { requireLogin } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/sales?day=ID: vendas e faturação de um dia
router.get('/', requireLogin, saleController.listSales);

// POST /api/events/:eventId/sales: registar vendas no dia escolhido
router.post('/', requireLogin, requireEditableEvent, saleController.createSales);

// POST /api/events/:eventId/sales/:saleId/cancel: anular uma venda (o controller confirma quem pode)
router.post('/:saleId/cancel', requireLogin, requireEditableEvent, saleController.cancelSale);

// POST /api/events/:eventId/sales/totals: faturação do dia pelo total (eventos só com valores)
router.post('/totals', requireLogin, requireEditableEvent, saleController.createDayTotal);

// DELETE /api/events/:eventId/sales/totals/:revenueId: apagar um total registado por engano
router.delete('/totals/:revenueId', requireLogin, requireEditableEvent, saleController.deleteDayTotal);

module.exports = router;
