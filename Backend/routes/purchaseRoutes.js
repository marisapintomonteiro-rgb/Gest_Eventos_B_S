// routes/purchaseRoutes.js: endereços da API das compras de um evento (/api/events/:eventId/purchases).
// Só Gestor e Administrador: as compras têm preços (informação financeira).

const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const { requireRole } = require('../middleware/authMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/purchases: compras do evento e stock
router.get('/', requireRole('Gestor'), purchaseController.listPurchases);

// POST /api/events/:eventId/purchases: registar uma compra
router.post('/', requireRole('Gestor'), purchaseController.createPurchase);

// DELETE /api/events/:eventId/purchases/:purchaseId: apagar uma compra registada por engano
router.delete('/:purchaseId', requireRole('Gestor'), purchaseController.deletePurchase);

module.exports = router;
