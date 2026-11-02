// controllers/supplierController.js: fornecedores da marca (RF11, só Gestor e Administrador).

const supplierModel = require('../models/supplierModel');

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Telefone português: 9 algarismos (pode ter espaços e o indicativo +351 no início)
function isValidPhone(phone) {
    return /^(\+351)?\d{9}$/.test(phone.replace(/\s/g, ''));
}

// Campo de texto opcional: vazio passa a null
function toOptionalText(value) {
    const text = String(value || '').trim();
    return text === '' ? null : text;
}

// GET /api/suppliers: lista os fornecedores da marca
async function listSuppliers(req, res) {
    try {
        const suppliers = await supplierModel.findSuppliersByBrand(req.session.user.brandId);
        res.json({ suppliers });
    } catch (error) {
        console.error('Erro ao listar os fornecedores:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os fornecedores. Tenta novamente.' });
    }
}

// POST /api/suppliers: cria um fornecedor
async function createSupplier(req, res) {
    const supplier = {
        supplierName: String(req.body.supplierName || '').trim(),
        contact: String(req.body.contact || '').trim(),
        email: toOptionalText(req.body.email),
        nif: toOptionalText(req.body.nif),
        address: toOptionalText(req.body.address),
        acceptsReturns: req.body.acceptsReturns ? 1 : 0
    };

    if (supplier.supplierName.length === 0 || supplier.supplierName.length > 100) {
        return res.status(400).json({ error: 'Indica o nome do fornecedor (até 100 caracteres).' });
    }

    if (!isValidPhone(supplier.contact)) {
        return res.status(400).json({ error: 'O telefone tem de ter 9 algarismos (ex.: 912 345 678).' });
    }

    if (supplier.email !== null && !isValidEmail(supplier.email)) {
        return res.status(400).json({ error: 'O email do fornecedor não é válido.' });
    }

    if (supplier.nif !== null && !/^\d{9}$/.test(supplier.nif)) {
        return res.status(400).json({ error: 'O NIF tem de ter 9 algarismos.' });
    }

    if (supplier.address !== null && supplier.address.length > 255) {
        return res.status(400).json({ error: 'A morada pode ter até 255 caracteres.' });
    }

    try {
        const supplierId = await supplierModel.createSupplier(req.session.user.brandId, supplier);
        res.status(201).json({ supplierId, message: `Fornecedor "${supplier.supplierName}" criado.` });
    } catch (error) {
        console.error('Erro ao criar o fornecedor:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o fornecedor. Tenta novamente.' });
    }
}

module.exports = { listSuppliers, createSupplier };
