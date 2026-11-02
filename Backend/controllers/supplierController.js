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

// Lê os dados do fornecedor que vieram no pedido
function readSupplier(body) {
    return {
        supplierName: String(body.supplierName || '').trim(),
        contact: String(body.contact || '').trim(),
        email: toOptionalText(body.email),
        nif: toOptionalText(body.nif),
        address: toOptionalText(body.address),
        acceptsReturns: body.acceptsReturns ? 1 : 0
    };
}

// Confirma os dados do fornecedor. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
function validateSupplier(supplier) {
    if (supplier.supplierName.length === 0 || supplier.supplierName.length > 100) {
        return 'Indica o nome do fornecedor (até 100 caracteres).';
    }

    if (!isValidPhone(supplier.contact)) {
        return 'O telefone tem de ter 9 algarismos (ex.: 912 345 678).';
    }

    if (supplier.email !== null && !isValidEmail(supplier.email)) {
        return 'O email do fornecedor não é válido.';
    }

    if (supplier.nif !== null && !/^\d{9}$/.test(supplier.nif)) {
        return 'O NIF tem de ter 9 algarismos.';
    }

    if (supplier.address !== null && supplier.address.length > 255) {
        return 'A morada pode ter até 255 caracteres.';
    }

    return null;
}

// POST /api/suppliers: cria um fornecedor
async function createSupplier(req, res) {
    const supplier = readSupplier(req.body);
    const errorMessage = validateSupplier(supplier);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const supplierId = await supplierModel.createSupplier(req.session.user.brandId, supplier);
        res.status(201).json({ supplierId, message: `Fornecedor "${supplier.supplierName}" criado.` });
    } catch (error) {
        console.error('Erro ao criar o fornecedor:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o fornecedor. Tenta novamente.' });
    }
}

// PUT /api/suppliers/:id: altera os dados de um fornecedor
async function updateSupplier(req, res) {
    const supplier = readSupplier(req.body);
    const errorMessage = validateSupplier(supplier);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const updated = await supplierModel.updateSupplier(req.session.user.brandId, Number(req.params.id), supplier);

        if (!updated) {
            return res.status(404).json({ error: 'Este fornecedor não existe.' });
        }

        res.json({ message: `Fornecedor "${supplier.supplierName}" alterado.` });
    } catch (error) {
        console.error('Erro ao alterar o fornecedor:', error.message);
        res.status(500).json({ error: 'Não foi possível alterar o fornecedor. Tenta novamente.' });
    }
}

module.exports = { listSuppliers, createSupplier, updateSupplier };
