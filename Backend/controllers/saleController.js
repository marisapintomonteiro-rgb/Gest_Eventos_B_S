// controllers/saleController.js: vendas de cada dia do evento (RF14, RF15 e RF30).
// Todos os perfis registam vendas; o Colaborador só anula as suas.
// A faturação do dia (valores em euros) é só para o Gestor e o Administrador (RF30).

const saleModel = require('../models/saleModel');
const menuModel = require('../models/menuModel');
const eventModel = require('../models/eventModel');
const stockModel = require('../models/stockModel');

const MAX_QUANTITY = 100000;

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// Resumo do dia: faturação e quantidade vendida de cada artigo (sem as vendas anuladas).
// Os totais registados em euros (eventos só com valores) somam à faturação.
function summarizeDay(sales, dayTotals = []) {
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
    const totalsAmount = dayTotals.reduce((sum, total) => sum + Number(total.amount), 0);
    const revenue = items.reduce((sum, item) => sum + item.revenue, 0) + totalsAmount;

    return { revenue, items };
}

// O Colaborador vê as quantidades vendidas, mas nenhum valor em euros (RF30):
// sem preço nas vendas, sem totais em euros, sem faturação e sem objetivo do dia
function hideMoney(result) {
    const { revenue_target: revenueTarget, ...day } = result.day;

    return {
        day,
        sales: result.sales.map(({ unit_price: unitPrice, ...sale }) => sale),
        dayTotals: [],
        summary: { items: result.summary.items.map(({ revenue, ...item }) => item) }
    };
}

// GET /api/events/:eventId/sales?day=ID: vendas e faturação de um dia
async function listSales(req, res) {
    try {
        const event = await findEvent(req);
        const day = event ? await eventModel.findDayInEvent(event.event_id, Number(req.query.day)) : null;

        if (!day) {
            return res.status(404).json({ error: 'Este dia não existe neste evento.' });
        }

        const [sales, dayTotals] = await Promise.all([
            saleModel.findSalesByDay(day.event_day_id),
            saleModel.findDayTotals(day.event_day_id)
        ]);
        const result = { day, sales, dayTotals, summary: summarizeDay(sales, dayTotals) };
        res.json(req.session.user.role === 'Colaborador' ? hideMoney(result) : result);
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

        const trackStock = Boolean(event.track_stock);
        await saleModel.createSales(event.event_id, day.event_day_id, userId, fullLines, trackStock);
        const total = fullLines.reduce((sum, line) => sum + line.quantity, 0);

        // Sem controlo de stock não há avisos de stock
        if (!trackStock) {
            return res.status(201).json({ message: `Registadas ${total} vendas.`, warnings: [] });
        }

        // A venda fica sempre registada; se algum produto ficar com stock negativo, avisa
        const productIds = fullLines.flatMap((line) => line.item.products.map((product) => product.product_id));
        const stock = await stockModel.findStockOfProducts(event.event_id, productIds);
        const warnings = stock
            .filter((row) => !row.is_residual && Number(row.quantity) < 0)
            .map((row) => ({ productName: row.product_name, quantity: Number(row.quantity), unit: row.unit }));

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

// POST /api/events/:eventId/sales/totals: faturação do dia pelo total em euros (sem artigos).
// Só nos eventos que não controlam o stock.
async function createDayTotal(req, res) {
    const amount = Number(req.body.amount);
    const note = String(req.body.note || '').trim();

    if (Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Indica o valor faturado (maior do que zero).' });
    }

    if (note.length > 150) {
        return res.status(400).json({ error: 'A nota pode ter até 150 caracteres.' });
    }

    try {
        const event = await findEvent(req);
        const day = event ? await eventModel.findDayInEvent(event.event_id, Number(req.body.eventDayId)) : null;

        if (!day) {
            return res.status(400).json({ error: 'Escolhe um dia deste evento.' });
        }

        if (event.track_stock) {
            return res.status(400).json({ error: 'Este evento controla o stock: regista as vendas pelos artigos da ementa.' });
        }

        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia está fechado. Pede ao Gestor para o reabrir.' });
        }

        await saleModel.createDayTotal(event.event_id, day.event_day_id, req.session.user.userId, amount, note === '' ? null : note);
        res.status(201).json({ message: 'Faturação registada.' });
    } catch (error) {
        console.error('Erro ao registar a faturação:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a faturação. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/sales/totals/:revenueId: apagar um total registado por engano
// (o Colaborador só apaga os seus; o Gestor e o Administrador apagam qualquer um)
async function deleteDayTotal(req, res) {
    const { userId, role } = req.session.user;

    try {
        const event = await findEvent(req);
        const total = event ? await saleModel.findDayTotalInEvent(event.event_id, Number(req.params.revenueId)) : null;

        if (!total) {
            return res.status(404).json({ error: 'Este registo não existe.' });
        }

        if (role === 'Colaborador' && total.created_by !== userId) {
            return res.status(403).json({ error: 'Só podes apagar o que registaste.' });
        }

        const day = await eventModel.findDayInEvent(event.event_id, total.event_day_id);

        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia está fechado. Pede ao Gestor para o reabrir.' });
        }

        await saleModel.deleteDayTotal(total.revenue_id);
        res.json({ message: 'Registo apagado.' });
    } catch (error) {
        console.error('Erro ao apagar a faturação:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar o registo. Tenta novamente.' });
    }
}

module.exports = { listSales, createSales, cancelSale, createDayTotal, deleteDayTotal };
