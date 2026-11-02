// controllers/expenseController.js: despesas do evento (RF20, só Gestor e Administrador).

const expenseModel = require('../models/expenseModel');
const eventModel = require('../models/eventModel');

const EXPENSE_TYPES = ['Fixa', 'Variável'];

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// GET /api/events/:eventId/expenses: despesas do evento e o orçamento
async function listExpenses(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const expenses = await expenseModel.findExpensesByEvent(event.event_id);
        res.json({ event, expenses });
    } catch (error) {
        console.error('Erro ao listar as despesas:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as despesas. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/expenses: registar uma despesa (do evento ou de um dia)
async function createExpense(req, res) {
    const hasDay = req.body.eventDayId !== undefined && req.body.eventDayId !== null && req.body.eventDayId !== '';
    const expense = {
        description: String(req.body.description || '').trim(),
        type: String(req.body.type || ''),
        amount: Number(req.body.amount),
        eventDayId: null
    };

    if (expense.description.length === 0 || expense.description.length > 150) {
        return res.status(400).json({ error: 'Indica a descrição da despesa (até 150 caracteres).' });
    }

    if (!EXPENSE_TYPES.includes(expense.type)) {
        return res.status(400).json({ error: 'A despesa tem de ser fixa ou variável.' });
    }

    if (Number.isNaN(expense.amount) || expense.amount <= 0) {
        return res.status(400).json({ error: 'O valor tem de ser maior do que zero.' });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        if (hasDay) {
            const day = await eventModel.findDayInEvent(event.event_id, Number(req.body.eventDayId));

            if (!day) {
                return res.status(400).json({ error: 'Este dia não existe neste evento.' });
            }

            expense.eventDayId = day.event_day_id;
        }

        await expenseModel.createExpense(event.event_id, req.session.user.userId, expense);
        res.status(201).json({ message: 'Despesa registada.' });
    } catch (error) {
        console.error('Erro ao registar a despesa:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a despesa. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/expenses/:expenseId: apagar uma despesa registada por engano
async function deleteExpense(req, res) {
    try {
        const event = await findEvent(req);
        const expense = event ? await expenseModel.findExpenseInEvent(event.event_id, Number(req.params.expenseId)) : null;

        if (!expense) {
            return res.status(404).json({ error: 'Esta despesa não existe.' });
        }

        await expenseModel.deleteExpense(expense.expense_id);
        res.json({ message: 'Despesa apagada.' });
    } catch (error) {
        console.error('Erro ao apagar a despesa:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar a despesa. Tenta novamente.' });
    }
}

module.exports = { listExpenses, createExpense, deleteExpense };
