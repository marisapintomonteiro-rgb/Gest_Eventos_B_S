// controllers/purchaseController.js: compras de cada evento (RF12, só Gestor e Administrador).
// Cada compra aumenta o stock do evento e atualiza o histórico de preços dos produtos.

const purchaseModel = require('../models/purchaseModel');
const eventModel = require('../models/eventModel');
const supplierModel = require('../models/supplierModel');
const productModel = require('../models/productModel');
const stockModel = require('../models/stockModel');
const saleModel = require('../models/saleModel');

// Data no formato AAAA-MM-DD e que existe mesmo no calendário (ex.: não aceita 2027-02-30)
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return false;
    }

    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

function isPositiveNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

// Lê os dados da compra e as linhas (produto, embalagens, preço por embalagem) que vieram no pedido
function readPurchase(body) {
    const notes = String(body.notes || '').trim();

    const purchase = {
        supplierId: Number(body.supplierId),
        purchaseDate: String(body.purchaseDate || ''),
        notes: notes === '' ? null : notes
    };

    const lines = (Array.isArray(body.lines) ? body.lines : []).map((line) => ({
        productId: Number(line.productId),
        packages: Number(line.packages),
        packagePrice: Number(line.packagePrice)
    }));

    return { purchase, lines };
}

// Confirma os dados da compra. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
function validatePurchase(purchase, lines, event) {
    if (!isValidDate(purchase.purchaseDate)) {
        return 'Indica a data da compra.';
    }

    // As compras são feitas antes ou durante o evento
    if (event.last_day && purchase.purchaseDate > event.last_day) {
        return 'A data da compra não pode ser depois do último dia do evento.';
    }

    if (purchase.notes !== null && purchase.notes.length > 255) {
        return 'As notas podem ter até 255 caracteres.';
    }

    if (lines.length === 0) {
        return 'Indica pelo menos um produto comprado.';
    }

    const productIds = lines.map((line) => line.productId);

    if (new Set(productIds).size !== productIds.length) {
        return 'Cada produto só pode aparecer uma vez na mesma compra.';
    }

    for (const line of lines) {
        if (!isPositiveNumber(line.packages)) {
            return 'O número de embalagens tem de ser maior do que zero.';
        }

        if (!isPositiveNumber(line.packagePrice)) {
            return 'O preço de cada embalagem tem de ser maior do que zero.';
        }
    }

    return null;
}

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// GET /api/events/:eventId/purchases: compras do evento e o stock que criaram
async function listPurchases(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const [purchases, stock] = await Promise.all([
            purchaseModel.findPurchasesByEvent(event.event_id),
            stockModel.findStockByEvent(event.event_id)
        ]);

        res.json({ event, purchases, stock });
    } catch (error) {
        console.error('Erro ao listar as compras:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as compras. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/purchases: registar uma compra
async function createPurchase(req, res) {
    const { brandId, userId } = req.session.user;
    const { purchase, lines } = readPurchase(req.body);

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const errorMessage = validatePurchase(purchase, lines, event);

        if (errorMessage) {
            return res.status(400).json({ error: errorMessage });
        }

        const supplierIds = await supplierModel.findSupplierIdsOfBrand(brandId, [purchase.supplierId]);

        if (supplierIds.length === 0) {
            return res.status(400).json({ error: 'Escolhe um fornecedor desta marca.' });
        }

        const brandProducts = await productModel.findProductsOfBrand(brandId, lines.map((line) => line.productId));

        if (brandProducts.length !== lines.length) {
            return res.status(400).json({ error: 'Um dos produtos escolhidos não existe nesta marca.' });
        }

        // O tamanho da embalagem vem do produto e fica guardado na compra (ex.: barril de 30000 ml)
        const fullLines = lines.map((line) => ({
            ...line,
            packageQuantity: Number(brandProducts.find((product) => product.product_id === line.productId).package_quantity)
        }));

        const purchaseId = await purchaseModel.createPurchase(event.event_id, userId, purchase, fullLines);
        res.status(201).json({ purchaseId, message: 'Compra registada. O stock do evento foi atualizado.' });
    } catch (error) {
        console.error('Erro ao registar a compra:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a compra. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/purchases/:purchaseId: apagar uma compra registada por engano.
// Só enquanto o evento não tem vendas; depois disso, os acertos fazem-se com a correção de stock.
async function deletePurchase(req, res) {
    const purchaseId = Number(req.params.purchaseId);

    try {
        const event = await findEvent(req);

        if (!event || !await purchaseModel.findPurchaseInEvent(event.event_id, purchaseId)) {
            return res.status(404).json({ error: 'Esta compra não existe.' });
        }

        if (await saleModel.eventHasSales(event.event_id)) {
            return res.status(400).json({ error: 'O evento já tem vendas: a compra não pode ser apagada. Usa a correção de stock.' });
        }

        await purchaseModel.deletePurchase(purchaseId);
        res.json({ message: 'Compra apagada. O stock do evento foi atualizado.' });
    } catch (error) {
        console.error('Erro ao apagar a compra:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar a compra. Tenta novamente.' });
    }
}

module.exports = { listPurchases, createPurchase, deletePurchase };
