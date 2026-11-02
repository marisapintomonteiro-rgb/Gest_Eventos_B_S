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

module.exports = { findStockByEvent, findStockOfProducts };
