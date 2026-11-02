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
async function createSales(eventId, dayId, userId, lines) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const line of lines) {
            const [result] = await connection.execute(
                `INSERT INTO sales (event_id, event_day_id, menu_item_id, item_name, quantity, unit_price, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [eventId, dayId, line.item.menu_item_id, line.item.item_name, line.quantity, line.item.price, userId]
            );

            for (const product of line.item.products) {
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

module.exports = {
    findSalesByDay,
    findSaleInEvent,
    eventHasSales,
    itemHasSales,
    createSales,
    cancelSale
};
