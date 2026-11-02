// routes/noteRoutes.js: endereços da API das notas de um evento (/api/events/:eventId/notes).

const express = require('express');
const noteController = require('../controllers/noteController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');

// mergeParams: deixa este router ler o :eventId que está no endereço do server.js
const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/notes: ler as notas (todos os perfis)
router.get('/', requireLogin, noteController.listNotes);

// POST /api/events/:eventId/notes: escrever uma nota (Gestor e Administrador)
router.post('/', requireRole('Gestor'), noteController.createNote);

// DELETE /api/events/:eventId/notes/:noteId: apagar uma nota (Gestor e Administrador)
router.delete('/:noteId', requireRole('Gestor'), noteController.deleteNote);

module.exports = router;
