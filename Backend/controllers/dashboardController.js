// controllers/dashboardController.js: dashboard e resultados financeiros do evento (RF21, RF23).
// Todos os perfis veem a faturação, os artigos mais vendidos e o stock baixo.
// Só o Gestor e o Administrador recebem os valores financeiros (despesas, compras, resultado).

const eventModel = require('../models/eventModel');
const saleModel = require('../models/saleModel');
const purchaseModel = require('../models/purchaseModel');
const expenseModel = require('../models/expenseModel');
const stockModel = require('../models/stockModel');
const returnModel = require('../models/returnModel');
const noteModel = require('../models/noteModel');
const invoiceModel = require('../models/invoiceModel');
const { getEditDeadline, isEventEditable } = require('../middleware/eventMiddleware');

function roundMoney(value) {
    return Math.round(value * 100) / 100;
}

// Stock baixo (RF18): igual ou abaixo do mínimo, ou negativo
function findLowStock(stock) {
    return stock
        .filter((row) => !row.is_residual)
        .filter((row) => Number(row.quantity) < 0 || (row.min_stock !== null && Number(row.quantity) <= Number(row.min_stock)))
        .map((row) => ({
            productName: row.product_name,
            quantity: Number(row.quantity),
            minStock: row.min_stock === null ? null : Number(row.min_stock),
            unit: row.unit
        }));
}

// Valor do stock que sobra, ao custo médio de compra de cada produto neste evento.
// O que se gastou em compras e não está em stock foi consumido (vendido, oferecido, perdido...).
function calculateStockValue(stock, costs) {
    let remaining = 0;

    costs.forEach((cost) => {
        const row = stock.find((item) => item.product_id === cost.product_id);
        const quantity = row ? Math.max(Number(row.quantity), 0) : 0;
        const averageCost = Number(cost.quantity) > 0 ? Number(cost.cost) / Number(cost.quantity) : 0;
        remaining += quantity * averageCost;
    });

    return roundMoney(remaining);
}

// Resultados financeiros do evento (RF21). As compras não entram nas despesas (não se contam duas vezes);
// as devoluções baixam o custo das compras; o stock que sobra fica separado do que foi consumido.
async function calculateFinance(event, revenue, stock) {
    const [costs, expenses, returnTotal, invoiceTotal] = await Promise.all([
        purchaseModel.findPurchaseCostByProduct(event.event_id),
        expenseModel.findExpensesByEvent(event.event_id),
        returnModel.sumReturnsByEvent(event.event_id),
        invoiceModel.sumInvoicesByEvent(event.event_id)
    ]);

    // Compras = compras com produtos + faturas registadas pelo valor total
    const productPurchases = costs.reduce((sum, cost) => sum + Number(cost.cost), 0);
    const purchases = roundMoney(productPurchases + invoiceTotal);
    const expenseTotal = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
    const returns = roundMoney(returnTotal);
    const spent = roundMoney(purchases - returns + expenseTotal);
    const stockValue = calculateStockValue(stock, costs);

    return {
        expenses,
        totals: {
            budget: event.budget === null ? null : Number(event.budget),
            purchases,
            returns,
            expenses: expenseTotal,
            spent,
            result: roundMoney(revenue - spent),
            stockValue,
            // Sem controlo de stock não se sabe o que sobrou: o consumido é o total das compras
            consumedValue: roundMoney(purchases - returns - stockValue)
        }
    };
}

// GET /api/events/:eventId/dashboard
async function getDashboard(req, res) {
    const isManager = req.session.user.role !== 'Colaborador';

    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const [days, topItems, stock] = await Promise.all([
            saleModel.findRevenueByDay(event.event_id),
            saleModel.findTopItems(event.event_id, 5),
            stockModel.findStockByEvent(event.event_id)
        ]);

        const revenue = roundMoney(days.reduce((sum, day) => sum + Number(day.revenue), 0));
        const dashboard = {
            event: {
                event_id: event.event_id,
                event_name: event.event_name,
                first_day: event.first_day,
                last_day: event.last_day,
                track_stock: Boolean(event.track_stock)
            },
            topItems: topItems.map((item) => ({ itemName: item.item_name, quantity: Number(item.quantity) })),
            lowStock: findLowStock(stock)
        };

        // Faturação e valores financeiros: só para quem gere (RF21, RF30).
        // O Colaborador vê os artigos mais vendidos (em quantidade) e o stock baixo.
        if (isManager) {
            dashboard.revenue = revenue;
            dashboard.days = days.map((day) => ({
                eventDayId: day.event_day_id,
                date: day.event_date,
                revenue: Number(day.revenue),
                target: day.revenue_target === null ? null : Number(day.revenue_target)
            }));
            dashboard.topItems.forEach((item, index) => {
                item.revenue = Number(topItems[index].revenue);
            });

            const finance = await calculateFinance(event, revenue, stock);
            dashboard.finance = finance.totals;
        }

        res.json(dashboard);
    } catch (error) {
        console.error('Erro ao montar o dashboard:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o dashboard. Tenta novamente.' });
    }
}

// GET /api/events/:eventId/report: tudo o que entra no relatório final (RF27), só Gestor e Administrador
async function getReport(req, res) {
    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const [revenueDays, closedDays, items, stock, returns, notes, invoices] = await Promise.all([
            saleModel.findRevenueByDay(event.event_id),
            eventModel.findDaysByEvent(event.event_id),
            saleModel.findTopItems(event.event_id, 1000),
            stockModel.findStockByEvent(event.event_id),
            returnModel.findReturnsByEvent(event.event_id),
            noteModel.findNotesByEvent(event.event_id),
            invoiceModel.findInvoicesByEvent(event.event_id)
        ]);

        const revenue = roundMoney(revenueDays.reduce((sum, day) => sum + Number(day.revenue), 0));
        const finance = await calculateFinance(event, revenue, stock);

        res.json({
            event: {
                ...event,
                edit_deadline: getEditDeadline(event.last_day),
                is_editable: isEventEditable(event.last_day)
            },
            revenue,
            days: revenueDays.map((day) => ({
                date: day.event_date,
                revenue: Number(day.revenue),
                target: day.revenue_target === null ? null : Number(day.revenue_target),
                isClosed: Boolean(closedDays.find((item) => item.event_day_id === day.event_day_id).is_closed)
            })),
            items: items.map((item) => ({ itemName: item.item_name, quantity: Number(item.quantity), revenue: Number(item.revenue) })),
            finance: finance.totals,
            expenses: finance.expenses,
            returns,
            invoices,
            stock,
            notes
        });
    } catch (error) {
        console.error('Erro ao montar o relatório:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o relatório. Tenta novamente.' });
    }
}

module.exports = { getDashboard, getReport };
