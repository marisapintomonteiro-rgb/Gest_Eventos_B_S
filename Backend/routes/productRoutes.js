// routes/productRoutes.js: endereços da API dos produtos e preços (só Gestor e Administrador).
// O Colaborador não tem acesso: os produtos têm preços de compra (informação financeira).

const express = require('express');
const productController = require('../controllers/productController');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/products: listar os produtos da marca
router.get('/', requireRole('Gestor'), productController.listProducts);

// POST /api/products: criar um produto
router.post('/', requireRole('Gestor'), productController.createProduct);

// GET /api/products/:id/prices: histórico de preços de um produto
router.get('/:id/prices', requireRole('Gestor'), productController.listPrices);

// POST /api/products/:id/prices: registar um preço novo
router.post('/:id/prices', requireRole('Gestor'), productController.addPrice);

module.exports = router;
