// models/eventModel.js: lê e grava os eventos, os seus dias e as suas despesas.

const pool = require('../config/database');

// Grava o evento, os dias e as despesas iniciais de uma só vez (transação).
// Devolve o número (event_id) do evento novo.
async function createEvent(brandId, userId, eventData, days, expenses) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [eventResult] = await connection.execute(
            `INSERT INTO events (brand_id, event_name, location, space_type, expected_audience, budget, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [brandId, eventData.eventName, eventData.location, eventData.spaceType,
                eventData.expectedAudience, eventData.budget, userId]
        );
        const eventId = eventResult.insertId;

        for (const day of days) {
            await connection.execute(
                'INSERT INTO event_days (event_id, event_date, start_time, end_time, revenue_target) VALUES (?, ?, ?, ?, ?)',
                [eventId, day.date, day.startTime, day.endTime, day.revenueTarget]
            );
        }

        for (const expense of expenses) {
            await connection.execute(
                `INSERT INTO expenses (event_id, description, expense_type, amount, created_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [eventId, expense.description, expense.type, expense.amount, userId]
            );
        }

        await connection.commit();
        return eventId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Lista os eventos de uma marca, com o primeiro e o último dia de cada um
async function findEventsByBrand(brandId) {
    const [rows] = await pool.execute(
        `SELECT e.event_id, e.event_name, e.location,
                MIN(d.event_date) AS first_day, MAX(d.event_date) AS last_day,
                COUNT(d.event_day_id) AS day_count
         FROM events e
         LEFT JOIN event_days d ON d.event_id = e.event_id
         WHERE e.brand_id = ?
         GROUP BY e.event_id
         ORDER BY first_day DESC`,
        [brandId]
    );
    return rows;
}

module.exports = { createEvent, findEventsByBrand };