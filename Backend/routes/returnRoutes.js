// routes/returnRoutes.js: devoluções a fornecedores de um evento (/api/events/:eventId/returns).
// Só Gestor e Administrador. Depois do encerramento ainda se pode devolver, dentro do prazo (RF26).

const express = require('express');
const returnController = require('../controllers/returnController');
const { requireRole } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

router.get('/', requireRole('Gestor'), returnController.listReturns);
router.post('/', requireRole('Gestor'), requireEditableEvent, returnController.createReturn);
router.delete('/:returnId', requireRole('Gestor'), requireEditableEvent, returnController.deleteReturn);

module.exports = router;
