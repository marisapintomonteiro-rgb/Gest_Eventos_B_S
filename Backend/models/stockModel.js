// models/stockModel.js: calcula o stock de cada evento (RF15).
// Stock de um produto = o que entrou com as compras + os movimentos (as saídas são negativas).

const pool = require('../config/database');

// Stock do evento, por produto. Aparecem os produtos que tiveram compras ou movimentos.
async function findStockByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT p.product_id, p.product_name, p.unit, p.min_stock, p.is_residual,
                SUM(t.purchased) AS purchased, SUM(t.moved) AS moved, SUM(t.purchased + t.moved) AS quantity
         FROM (
             SELECT pl.product_id, pl.quantity AS purchased, 0 AS moved
             FROM purchase_lines pl
             JOIN purchases pu ON pu.purchase_id = pl.purchase_id
             WHERE pu.event_id = ?
             UNION ALL
             SELECT sm.product_id, 0 AS purchased, sm.quantity AS moved
             FROM stock_movements sm
             WHERE sm.event_id = ?
         ) t
         JOIN products p ON p.product_id = t.product_id
         GROUP BY p.product_id
         ORDER BY p.product_name`,
        [eventId, eventId]
    );
    return rows;
}

// Stock atual de alguns produtos (usado para avisar quando uma venda deixa o stock negativo)
async function findStockOfProducts(eventId, productIds) {
    const stock = await findStockByEvent(eventId);
    return stock.filter((row) => productIds.includes(row.product_id));
}

// Movimentos do evento que não vêm de vendas (consumos, ofertas, quebras, desperdícios, correções e devoluções),
// do mais recente para o mais antigo
async function findMovementsByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT sm.movement_id, sm.movement_type, sm.quantity, sm.reason, sm.previous_quantity, sm.new_quantity,
                sm.created_at, p.product_name, p.unit, d.event_date, u.email AS created_by_email
         FROM stock_movements sm
         JOIN products p ON p.product_id = sm.product_id
         JOIN users u ON u.user_id = sm.created_by
         LEFT JOIN event_days d ON d.event_day_id = sm.event_day_id
         WHERE sm.event_id = ? AND sm.movement_type <> 'Venda'
         ORDER BY sm.created_at DESC, sm.movement_id DESC`,
        [eventId]
    );
    return rows;
}

// Grava um movimento de stock. Nas correções leva também a quantidade anterior e a nova.
async function createMovement(eventId, userId, movement) {
    await pool.execute(
        `INSERT INTO stock_movements
             (event_id, product_id, event_day_id, movement_type, quantity, reason, previous_quantity, new_quantity, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventId, movement.productId, movement.eventDayId, movement.type, movement.quantity, movement.reason,
            movement.previousQuantity, movement.newQuantity, userId]
    );
}

module.exports = { findStockByEvent, findStockOfProducts, findMovementsByEvent, createMovement };
