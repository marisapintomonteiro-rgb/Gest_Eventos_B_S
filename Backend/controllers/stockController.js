// controllers/stockController.js: stock do evento, saídas e correções (RF15, RF16, RF17, RF18).
// Consumo interno: todos os perfis. Ofertas, quebras e desperdícios: Gestor e Administrador.
// Correções manuais: só Gestor e Administrador (secção 17), com a quantidade anterior, a nova e o motivo.

const stockModel = require('../models/stockModel');
const eventModel = require('../models/eventModel');
const productModel = require('../models/productModel');

// Tipos de saída e o perfil mínimo para registar cada um
const OUT_TYPES = {
    'Consumo interno': 'Colaborador',
    Oferta: 'Gestor',
    Quebra: 'Gestor',
    Desperdício: 'Gestor'
};

const ROLE_LEVELS = { Colaborador: 1, Gestor: 2, Administrador: 3 };

function hasRole(userRole, requiredRole) {
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

function readReason(value) {
    const reason = String(value || '').trim();
    return reason === '' ? null : reason;
}

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// Confirma que o produto é da marca
async function productExists(brandId, productId) {
    const products = await productModel.findProductsOfBrand(brandId, [productId]);
    return products.length === 1;
}

// GET /api/events/:eventId/stock: stock atual e movimentos (sem valores em euros)
async function getStock(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const [stock, movements] = await Promise.all([
            stockModel.findStockByEvent(event.event_id),
            stockModel.findMovementsByEvent(event.event_id)
        ]);

        res.json({ event, stock, movements });
    } catch (error) {
        console.error('Erro ao ler o stock:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o stock. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/stock/movements: registar uma saída (consumo interno, oferta, quebra, desperdício)
async function createOutMovement(req, res) {
    const { brandId, userId, role } = req.session.user;
    const type = String(req.body.type || '');
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity);
    const dayId = Number(req.body.eventDayId);
    const reason = readReason(req.body.reason);

    if (!OUT_TYPES[type]) {
        return res.status(400).json({ error: 'Escolhe o tipo: consumo interno, oferta, quebra ou desperdício.' });
    }

    if (!hasRole(role, OUT_TYPES[type])) {
        return res.status(403).json({ error: 'Só o Gestor pode registar ofertas, quebras e desperdícios.' });
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'A quantidade tem de ser maior do que zero.' });
    }

    if (reason !== null && reason.length > 255) {
        return res.status(400).json({ error: 'O motivo pode ter até 255 caracteres.' });
    }

    try {
        const event = await findEvent(req);
        const day = event ? await eventModel.findDayInEvent(event.event_id, dayId) : null;

        if (!day) {
            return res.status(400).json({ error: 'Escolhe um dia deste evento.' });
        }

        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia está fechado. Pede ao Gestor para o reabrir.' });
        }

        if (!await productExists(brandId, productId)) {
            return res.status(400).json({ error: 'Escolhe um produto desta marca.' });
        }

        // Uma saída fica guardada como quantidade negativa
        await stockModel.createMovement(event.event_id, userId, {
            productId,
            eventDayId: day.event_day_id,
            type,
            quantity: -quantity,
            reason,
            previousQuantity: null,
            newQuantity: null
        });

        res.status(201).json({ message: `Movimento registado (${type.toLowerCase()}). O stock foi atualizado.` });
    } catch (error) {
        console.error('Erro ao registar o movimento:', error.message);
        res.status(500).json({ error: 'Não foi possível registar o movimento. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/stock/corrections: corrigir o stock de um produto para a quantidade contada
async function createCorrection(req, res) {
    const { brandId, userId } = req.session.user;
    const productId = Number(req.body.productId);
    const newQuantity = Number(req.body.newQuantity);
    const reason = readReason(req.body.reason);

    if (req.body.newQuantity === '' || Number.isNaN(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ error: 'Indica a quantidade contada (zero ou mais).' });
    }

    if (reason === null || reason.length > 255) {
        return res.status(400).json({ error: 'Indica o motivo da correção (até 255 caracteres).' });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        if (!await productExists(brandId, productId)) {
            return res.status(400).json({ error: 'Escolhe um produto desta marca.' });
        }

        // A diferença entre o que o sistema tem e o que foi contado é o movimento de correção
        const current = await stockModel.findStockOfProducts(event.event_id, [productId]);
        const previousQuantity = current.length > 0 ? Number(current[0].quantity) : 0;
        const difference = Math.round((newQuantity - previousQuantity) * 100) / 100;

        if (difference === 0) {
            return res.status(400).json({ error: 'O stock já tem essa quantidade: não há nada a corrigir.' });
        }

        await stockModel.createMovement(event.event_id, userId, {
            productId,
            eventDayId: null,
            type: 'Correção',
            quantity: difference,
            reason,
            previousQuantity,
            newQuantity
        });

        res.status(201).json({ message: 'Stock corrigido. Ficou guardada a quantidade anterior, a nova e o motivo.' });
    } catch (error) {
        console.error('Erro ao corrigir o stock:', error.message);
        res.status(500).json({ error: 'Não foi possível corrigir o stock. Tenta novamente.' });
    }
}

module.exports = { getStock, createOutMovement, createCorrection };
