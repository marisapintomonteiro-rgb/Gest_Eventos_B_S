// routes/invoiceRoutes.js: faturas de compra pelo valor total (/api/events/:eventId/invoices).
// Só Gestor e Administrador (informação financeira).

const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { requireRole } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

router.get('/', requireRole('Gestor'), invoiceController.listInvoices);
router.post('/', requireRole('Gestor'), requireEditableEvent, invoiceController.createInvoice);
router.delete('/:invoiceId', requireRole('Gestor'), requireEditableEvent, invoiceController.deleteInvoice);

module.exports = router;
