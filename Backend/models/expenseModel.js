// models/expenseModel.js: lê e grava as despesas de cada evento (RF20).
// As compras de produtos não são despesas: ficam nas compras (assim não se contam duas vezes).

const pool = require('../config/database');

// Despesas do evento, com o dia (se for de um dia) e quem registou
async function findExpensesByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT e.expense_id, e.event_day_id, e.description, e.expense_type, e.amount, e.created_at, d.event_date
         FROM expenses e
         LEFT JOIN event_days d ON d.event_day_id = e.event_day_id
         WHERE e.event_id = ?
         ORDER BY e.created_at, e.expense_id`,
        [eventId]
    );
    return rows;
}

// Confirma que a despesa pertence a este evento
async function findExpenseInEvent(eventId, expenseId) {
    const [rows] = await pool.execute(
        'SELECT expense_id FROM expenses WHERE event_id = ? AND expense_id = ?',
        [eventId, expenseId]
    );
    return rows[0] || null;
}

async function createExpense(eventId, userId, expense) {
    const [result] = await pool.execute(
        `INSERT INTO expenses (event_id, event_day_id, description, expense_type, amount, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, expense.eventDayId, expense.description, expense.type, expense.amount, userId]
    );
    return result.insertId;
}

async function deleteExpense(expenseId) {
    await pool.execute('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);
}

module.exports = { findExpensesByEvent, findExpenseInEvent, createExpense, deleteExpense };
