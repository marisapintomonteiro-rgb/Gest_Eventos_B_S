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

// Lista os eventos de uma marca, com o primeiro e o último dia e a lista dos dias de cada um
async function findEventsByBrand(brandId) {
    const [rows] = await pool.execute(
        `SELECT e.event_id, e.event_name, e.location,
                MIN(d.event_date) AS first_day, MAX(d.event_date) AS last_day,
                COUNT(d.event_day_id) AS day_count,
                GROUP_CONCAT(d.event_date ORDER BY d.event_date SEPARATOR ',') AS dates,
                MAX(ec.event_id IS NOT NULL) AS is_closed
         FROM events e
         LEFT JOIN event_days d ON d.event_id = e.event_id
         LEFT JOIN event_closings ec ON ec.event_id = e.event_id
         WHERE e.brand_id = ?
         GROUP BY e.event_id
         ORDER BY first_day DESC`,
        [brandId]
    );
    return rows;
}

// Procura um evento desta marca pelo número (para confirmar que o evento é mesmo da marca)
async function findEventById(brandId, eventId) {
    const [rows] = await pool.execute(
        `SELECT e.event_id, e.event_name, e.location, e.budget, MIN(d.event_date) AS first_day,
                MAX(d.event_date) AS last_day, MAX(ec.event_id IS NOT NULL) AS is_closed, MAX(ec.closed_at) AS closed_at
         FROM events e
         LEFT JOIN event_days d ON d.event_id = e.event_id
         LEFT JOIN event_closings ec ON ec.event_id = e.event_id
         WHERE e.brand_id = ? AND e.event_id = ?
         GROUP BY e.event_id`,
        [brandId, eventId]
    );
    return rows[0] || null;
}

// Dias de um evento, por ordem, com a indicação de fechado (RF19)
async function findDaysByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT d.event_day_id, d.event_date, d.start_time, d.end_time, d.revenue_target,
                (c.event_day_id IS NOT NULL) AS is_closed
         FROM event_days d
         LEFT JOIN day_closings c ON c.event_day_id = d.event_day_id
         WHERE d.event_id = ?
         ORDER BY d.event_date`,
        [eventId]
    );
    return rows;
}

// Um dia deste evento (ou null se o dia não for deste evento)
async function findDayInEvent(eventId, dayId) {
    const days = await findDaysByEvent(eventId);
    return days.find((day) => day.event_day_id === dayId) || null;
}

// Fecha um dia (RF19): a partir daqui não aceita novos registos
async function closeDay(dayId, userId) {
    await pool.execute('INSERT INTO day_closings (event_day_id, closed_by) VALUES (?, ?)', [dayId, userId]);
}

// Reabre um dia fechado, para corrigir (depois volta a fechar-se)
async function reopenDay(dayId) {
    await pool.execute('DELETE FROM day_closings WHERE event_day_id = ?', [dayId]);
}

// Encerra o evento (RF25)
async function closeEvent(eventId, userId) {
    await pool.execute('INSERT INTO event_closings (event_id, closed_by) VALUES (?, ?)', [eventId, userId]);
}

module.exports = {
    closeEvent,
    createEvent,
    findEventsByBrand,
    findEventById,
    findDaysByEvent,
    findDayInEvent,
    closeDay,
    reopenDay
};
