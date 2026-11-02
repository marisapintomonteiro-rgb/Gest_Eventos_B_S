// controllers/saleController.js: vendas de cada dia do evento (RF14, RF15 e RF30).
// Todos os perfis registam vendas e veem a faturação do dia; o Colaborador só anula as suas.

const saleModel = require('../models/saleModel');
const menuModel = require('../models/menuModel');
const eventModel = require('../models/eventModel');
const stockModel = require('../models/stockModel');

const MAX_QUANTITY = 100000;

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// Resumo do dia: faturação e quantidade vendida de cada artigo (sem as vendas anuladas)
function summarizeDay(sales) {
    const validSales = sales.filter((sale) => !sale.cancelled_at);
    const byItem = {};

    validSales.forEach((sale) => {
        if (!byItem[sale.item_name]) {
            byItem[sale.item_name] = { itemName: sale.item_name, quantity: 0, revenue: 0 };
        }

        byItem[sale.item_name].quantity += sale.quantity;
        byItem[sale.item_name].revenue += sale.quantity * Number(sale.unit_price);
    });

    const items = Object.values(byItem).sort((first, second) => second.quantity - first.quantity);
    const revenue = items.reduce((sum, item) => sum + item.revenue, 0);

    return { revenue, items };
}

// GET /api/events/:eventId/sales?day=ID: vendas e faturação de um dia
async function listSales(req, res) {
    try {
        const event = await findEvent(req);
        const day = event ? await eventModel.findDayInEvent(event.event_id, Number(req.query.day)) : null;

        if (!day) {
            return res.status(404).json({ error: 'Este dia não existe neste evento.' });
        }

        const sales = await saleModel.findSalesByDay(day.event_day_id);
        res.json({ day, sales, summary: summarizeDay(sales) });
    } catch (error) {
        console.error('Erro ao listar as vendas:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as vendas. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/sales: regista uma ou várias vendas no dia escolhido.
// Serve para vendas individuais (1 Mojito) e para totais por artigo (1000 cervejas).
async function createSales(req, res) {
    const { userId } = req.session.user;
    const dayId = Number(req.body.eventDayId);
    const lines = (Array.isArray(req.body.lines) ? req.body.lines : []).map((line) => ({
        menuItemId: Number(line.menuItemId),
        quantity: Number(line.quantity)
    }));

    if (lines.length === 0) {
        return res.status(400).json({ error: 'Escolhe pelo menos um artigo.' });
    }

    for (const line of lines) {
        if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > MAX_QUANTITY) {
            return res.status(400).json({ error: 'As quantidades têm de ser números inteiros maiores do que zero.' });
        }
    }

    try {
        const event = await findEvent(req);
        const day = event ? await eventModel.findDayInEvent(event.event_id, dayId) : null;

        if (!day) {
            return res.status(400).json({ error: 'Escolhe um dia deste evento.' });
        }

        // Um dia fechado não aceita novos registos (RF19)
        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia está fechado. Pede ao Gestor para o reabrir.' });
        }

        // Os artigos têm de ser da ementa deste evento; o preço e a receita vêm da ementa (não do pedido)
        const menu = await menuModel.findMenuByEvent(event.event_id);
        const fullLines = [];

        for (const line of lines) {
            const item = menu.find((menuItem) => menuItem.menu_item_id === line.menuItemId);

            if (!item) {
                return res.status(400).json({ error: 'Um dos artigos não está na ementa deste evento.' });
            }

            fullLines.push({ item, quantity: line.quantity });
        }

        await saleModel.createSales(event.event_id, day.event_day_id, userId, fullLines);

        // A venda fica sempre registada; se algum produto ficar com stock negativo, avisa
        const productIds = fullLines.flatMap((line) => line.item.products.map((product) => product.product_id));
        const stock = await stockModel.findStockOfProducts(event.event_id, productIds);
        const warnings = stock
            .filter((row) => !row.is_residual && Number(row.quantity) < 0)
            .map((row) => ({ productName: row.product_name, quantity: Number(row.quantity), unit: row.unit }));

        const total = fullLines.reduce((sum, line) => sum + line.quantity, 0);
        res.status(201).json({ message: `Registadas ${total} vendas.`, warnings });
    } catch (error) {
        console.error('Erro ao registar as vendas:', error.message);
        res.status(500).json({ error: 'Não foi possível registar as vendas. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/sales/:saleId/cancel: anula uma venda registada por engano.
// O Colaborador só anula as suas; o Gestor e o Administrador anulam qualquer uma.
async function cancelSale(req, res) {
    const { userId, role } = req.session.user;

    try {
        const event = await findEvent(req);
        const sale = event ? await saleModel.findSaleInEvent(event.event_id, Number(req.params.saleId)) : null;

        if (!sale) {
            return res.status(404).json({ error: 'Esta venda não existe.' });
        }

        if (sale.cancelled_at) {
            return res.status(400).json({ error: 'Esta venda já estava anulada.' });
        }

        if (role === 'Colaborador' && sale.created_by !== userId) {
            return res.status(403).json({ error: 'Só podes anular as vendas que registaste.' });
        }

        const day = await eventModel.findDayInEvent(event.event_id, sale.event_day_id);

        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia está fechado. Pede ao Gestor para o reabrir.' });
        }

        await saleModel.cancelSale(sale.sale_id, userId);
        res.json({ message: 'Venda anulada. O stock foi reposto.' });
    } catch (error) {
        console.error('Erro ao anular a venda:', error.message);
        res.status(500).json({ error: 'Não foi possível anular a venda. Tenta novamente.' });
    }
}

module.exports = { listSales, createSales, cancelSale };
