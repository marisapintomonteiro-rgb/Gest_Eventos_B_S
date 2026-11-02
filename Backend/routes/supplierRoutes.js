// routes/supplierRoutes.js: endereços da API dos fornecedores (só Gestor e Administrador).

const express = require('express');
const supplierController = require('../controllers/supplierController');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/suppliers: listar os fornecedores da marca
router.get('/', requireRole('Gestor'), supplierController.listSuppliers);

// POST /api/suppliers: criar um fornecedor
router.post('/', requireRole('Gestor'), supplierController.createSupplier);

// PUT /api/suppliers/:id: alterar um fornecedor
router.put('/:id', requireRole('Gestor'), supplierController.updateSupplier);

module.exports = router;
