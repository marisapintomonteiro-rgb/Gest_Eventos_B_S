// models/saleModel.js: lê e grava as vendas (RF14) e o que cada venda tira do stock (RF15).

const pool = require('../config/database');

// Vendas de um dia (as anuladas também aparecem, marcadas), da mais recente para a mais antiga
async function findSalesByDay(dayId) {
    const [rows] = await pool.execute(
        `SELECT s.sale_id, s.menu_item_id, s.item_name, s.quantity, s.unit_price, s.created_at,
                s.created_by, u.email AS created_by_email, s.cancelled_at
         FROM sales s
         JOIN users u ON u.user_id = s.created_by
         WHERE s.event_day_id = ?
         ORDER BY s.created_at DESC, s.sale_id DESC`,
        [dayId]
    );
    return rows;
}

// Confirma que a venda pertence a este evento
async function findSaleInEvent(eventId, saleId) {
    const [rows] = await pool.execute(
        `SELECT sale_id, event_day_id, created_by, cancelled_at
         FROM sales
         WHERE event_id = ? AND sale_id = ?`,
        [eventId, saleId]
    );
    return rows[0] || null;
}

// Indica se o evento já tem vendas (não anuladas)
async function eventHasSales(eventId) {
    const [rows] = await pool.execute(
        'SELECT sale_id FROM sales WHERE event_id = ? AND cancelled_at IS NULL LIMIT 1',
        [eventId]
    );
    return rows.length > 0;
}

// Indica se um artigo da ementa já foi vendido (nesse caso não pode ser retirado da ementa)
async function itemHasSales(menuItemId) {
    const [rows] = await pool.execute('SELECT sale_id FROM sales WHERE menu_item_id = ? LIMIT 1', [menuItemId]);
    return rows.length > 0;
}

// Grava as vendas e os movimentos de stock de cada uma, de uma só vez (transação).
// Cada linha traz o artigo (nome, preço e produtos da receita) e a quantidade vendida.
// Por cada produto da receita sai do stock: quantidade da receita x quantidade vendida.
// Os produtos de consumo residual (ou sem quantidade) não descontam.
// trackStock false: o evento não controla o stock, por isso a venda não cria movimentos
async function createSales(eventId, dayId, userId, lines, trackStock = true) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const line of lines) {
            const [result] = await connection.execute(
                `INSERT INTO sales (event_id, event_day_id, menu_item_id, item_name, quantity, unit_price, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [eventId, dayId, line.item.menu_item_id, line.item.item_name, line.quantity, line.item.price, userId]
            );

            for (const product of trackStock ? line.item.products : []) {
                if (product.is_residual || product.quantity === null) {
                    continue;
                }

                await connection.execute(
                    `INSERT INTO stock_movements (event_id, product_id, event_day_id, movement_type, quantity, sale_id, created_by)
                     VALUES (?, ?, ?, 'Venda', ?, ?, ?)`,
                    [eventId, product.product_id, dayId, -Number(product.quantity) * line.quantity, result.insertId, userId]
                );
            }
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Anula uma venda: fica registada como anulada e o stock que tirou volta (apagam-se os seus movimentos)
async function cancelSale(saleId, userId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        await connection.execute(
            'UPDATE sales SET cancelled_by = ?, cancelled_at = NOW() WHERE sale_id = ?',
            [userId, saleId]
        );
        await connection.execute('DELETE FROM stock_movements WHERE sale_id = ?', [saleId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Faturação de cada dia do evento (todos os dias aparecem, mesmo sem vendas), com o objetivo do dia
async function findRevenueByDay(eventId) {
    const [rows] = await pool.execute(
        `SELECT d.event_day_id, d.event_date, d.revenue_target,
                COALESCE(SUM(CASE WHEN s.cancelled_at IS NULL THEN s.quantity * s.unit_price END), 0)
                + (SELECT COALESCE(SUM(r.amount), 0) FROM day_revenues r WHERE r.event_day_id = d.event_day_id) AS revenue
         FROM event_days d
         LEFT JOIN sales s ON s.event_day_id = d.event_day_id
         WHERE d.event_id = ?
         GROUP BY d.event_day_id
         ORDER BY d.event_date`,
        [eventId]
    );
    return rows;
}

// Artigos mais vendidos do evento (sem as vendas anuladas)
async function findTopItems(eventId, limit) {
    const [rows] = await pool.execute(
        `SELECT item_name, SUM(quantity) AS quantity, SUM(quantity * unit_price) AS revenue
         FROM sales
         WHERE event_id = ? AND cancelled_at IS NULL
         GROUP BY item_name
         ORDER BY quantity DESC
         LIMIT ${Number(limit)}`,
        [eventId]
    );
    return rows;
}

// ---------- Faturação do dia pelo total em euros (eventos só com valores) ----------

async function findDayTotals(dayId) {
    const [rows] = await pool.execute(
        `SELECT r.revenue_id, r.amount, r.note, r.created_at, r.created_by, u.email AS created_by_email
         FROM day_revenues r
         JOIN users u ON u.user_id = r.created_by
         WHERE r.event_day_id = ?
         ORDER BY r.created_at DESC, r.revenue_id DESC`,
        [dayId]
    );
    return rows;
}

async function findDayTotalInEvent(eventId, revenueId) {
    const [rows] = await pool.execute(
        'SELECT revenue_id, event_day_id, created_by FROM day_revenues WHERE event_id = ? AND revenue_id = ?',
        [eventId, revenueId]
    );
    return rows[0] || null;
}

async function createDayTotal(eventId, dayId, userId, amount, note) {
    await pool.execute(
        'INSERT INTO day_revenues (event_id, event_day_id, amount, note, created_by) VALUES (?, ?, ?, ?, ?)',
        [eventId, dayId, amount, note, userId]
    );
}

async function deleteDayTotal(revenueId) {
    await pool.execute('DELETE FROM day_revenues WHERE revenue_id = ?', [revenueId]);
}

module.exports = {
    findDayTotals,
    findDayTotalInEvent,
    createDayTotal,
    deleteDayTotal,
    findRevenueByDay,
    findTopItems,
    findSalesByDay,
    findSaleInEvent,
    eventHasSales,
    itemHasSales,
    createSales,
    cancelSale
};
