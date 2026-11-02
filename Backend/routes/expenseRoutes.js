// routes/expenseRoutes.js: endereços da API das despesas de um evento (/api/events/:eventId/expenses).
// Só Gestor e Administrador: são informação financeira.

const express = require('express');
const expenseController = require('../controllers/expenseController');
const { requireRole } = require('../middleware/authMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

router.get('/', requireRole('Gestor'), expenseController.listExpenses);
router.post('/', requireRole('Gestor'), expenseController.createExpense);
router.delete('/:expenseId', requireRole('Gestor'), expenseController.deleteExpense);

module.exports = router;
