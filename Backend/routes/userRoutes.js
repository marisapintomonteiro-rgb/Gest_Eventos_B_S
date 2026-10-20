// routes/userRoutes.js: endereços da API de gestão de utilizadores (só para o Administrador).

const express = require('express');
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users: listar as contas da marca
router.get('/', requireRole('Administrador'), userController.listUsers);

// POST /api/users: criar uma conta na marca
router.post('/', requireRole('Administrador'), userController.createUser);

// DELETE /api/users/:id: remover uma conta da marca
router.delete('/:id', requireRole('Administrador'), userController.removeUser);

module.exports = router;