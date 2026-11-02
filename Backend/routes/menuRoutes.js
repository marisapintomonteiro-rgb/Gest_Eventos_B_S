// routes/menuRoutes.js: endereços da API da ementa de um evento (/api/events/:eventId/menu).
// Consultar: todos os perfis (RF29). Alterar: só Gestor e Administrador (RF08, RF09, RF10).

const express = require('express');
const menuController = require('../controllers/menuController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');
const { requireEditableEvent } = require('../middleware/eventMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/menu: consultar a ementa
router.get('/', requireLogin, menuController.getMenu);

// POST /api/events/:eventId/menu: acrescentar um artigo
router.post('/', requireRole('Gestor'), requireEditableEvent, menuController.createItem);

// POST /api/events/:eventId/menu/copy: copiar a ementa de outro evento
router.post('/copy', requireRole('Gestor'), requireEditableEvent, menuController.copyMenu);

// PUT /api/events/:eventId/menu/:itemId: alterar um artigo
router.put('/:itemId', requireRole('Gestor'), requireEditableEvent, menuController.updateItem);

// DELETE /api/events/:eventId/menu/:itemId: tirar um artigo da ementa
router.delete('/:itemId', requireRole('Gestor'), requireEditableEvent, menuController.deleteItem);

module.exports = router;
