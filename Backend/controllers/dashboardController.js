// controllers/dashboardController.js: dashboard e resultados financeiros do evento (RF21, RF23).
// Todos os perfis veem a faturação, os artigos mais vendidos e o stock baixo.
// Só o Gestor e o Administrador recebem os valores financeiros (despesas, compras, resultado).

const eventModel = require('../models/eventModel');
const saleModel = require('../models/saleModel');
const purchaseModel = require('../models/purchaseModel');
const expenseModel = require('../models/expenseModel');
const stockModel = require('../models/stockModel');

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
            event: { event_id: event.event_id, event_name: event.event_name, first_day: event.first_day, last_day: event.last_day },
            revenue,
            days: days.map((day) => ({
                eventDayId: day.event_day_id,
                date: day.event_date,
                revenue: Number(day.revenue),
                target: day.revenue_target === null ? null : Number(day.revenue_target)
            })),
            topItems: topItems.map((item) => ({ itemName: item.item_name, quantity: Number(item.quantity), revenue: Number(item.revenue) })),
            lowStock: findLowStock(stock)
        };

        // Valores financeiros: só para quem gere (RF21)
        if (isManager) {
            const [costs, expenses] = await Promise.all([
                purchaseModel.findPurchaseCostByProduct(event.event_id),
                expenseModel.findExpensesByEvent(event.event_id)
            ]);

            const purchases = roundMoney(costs.reduce((sum, cost) => sum + Number(cost.cost), 0));
            const expenseTotal = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
            const returns = 0;
            const spent = roundMoney(purchases - returns + expenseTotal);
            const stockValue = calculateStockValue(stock, costs);

            dashboard.finance = {
                budget: event.budget === null ? null : Number(event.budget),
                purchases,
                returns,
                expenses: expenseTotal,
                spent,
                result: roundMoney(revenue - spent),
                stockValue,
                consumedValue: roundMoney(purchases - returns - stockValue)
            };
        }

        res.json(dashboard);
    } catch (error) {
        console.error('Erro ao montar o dashboard:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o dashboard. Tenta novamente.' });
    }
}

module.exports = { getDashboard };
