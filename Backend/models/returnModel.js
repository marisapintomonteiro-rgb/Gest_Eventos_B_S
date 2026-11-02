// models/returnModel.js: devoluções a fornecedores (RF22).

const pool = require('../config/database');

// Devoluções do evento, da mais recente para a mais antiga
async function findReturnsByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT r.return_id, r.packages, r.package_quantity, r.package_price, r.return_date,
                s.supplier_name, p.product_name, p.unit
         FROM purchase_returns r
         JOIN suppliers s ON s.supplier_id = r.supplier_id
         JOIN products p ON p.product_id = r.product_id
         WHERE r.event_id = ?
         ORDER BY r.return_date DESC, r.return_id DESC`,
        [eventId]
    );
    return rows;
}

// O que foi comprado neste evento a fornecedores que aceitam devoluções, por fornecedor e produto:
// embalagens compradas, preço médio pago, tamanho da embalagem e embalagens já devolvidas
async function findReturnableLines(eventId) {
    const [rows] = await pool.execute(
        `SELECT pu.supplier_id, s.supplier_name, pl.product_id, p.product_name, p.unit,
                MAX(pl.package_quantity) AS package_quantity,
                SUM(pl.packages) AS packages_bought,
                SUM(pl.packages * pl.package_price) / SUM(pl.packages) AS average_price,
                (SELECT COALESCE(SUM(r.packages), 0) FROM purchase_returns r
                 WHERE r.event_id = pu.event_id AND r.supplier_id = pu.supplier_id AND r.product_id = pl.product_id) AS packages_returned
         FROM purchase_lines pl
         JOIN purchases pu ON pu.purchase_id = pl.purchase_id
         JOIN suppliers s ON s.supplier_id = pu.supplier_id
         JOIN products p ON p.product_id = pl.product_id
         WHERE pu.event_id = ? AND s.accepts_returns = TRUE
         GROUP BY pu.event_id, pu.supplier_id, s.supplier_name, pl.product_id, p.product_name, p.unit
         ORDER BY s.supplier_name, p.product_name`,
        [eventId]
    );
    return rows;
}

// Total devolvido no evento (para os resultados)
async function sumReturnsByEvent(eventId) {
    const [rows] = await pool.execute(
        'SELECT COALESCE(SUM(packages * package_price), 0) AS total FROM purchase_returns WHERE event_id = ?',
        [eventId]
    );
    return Number(rows[0].total);
}

// Confirma que a devolução pertence a este evento
async function findReturnInEvent(eventId, returnId) {
    const [rows] = await pool.execute(
        'SELECT return_id, movement_id FROM purchase_returns WHERE event_id = ? AND return_id = ?',
        [eventId, returnId]
    );
    return rows[0] || null;
}

// Grava a devolução e o movimento que tira as embalagens do stock, de uma só vez (transação)
async function createReturn(eventId, userId, itemReturn) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [movement] = await connection.execute(
            `INSERT INTO stock_movements (event_id, product_id, movement_type, quantity, reason, created_by)
             VALUES (?, ?, 'Devolução', ?, ?, ?)`,
            [eventId, itemReturn.productId, -itemReturn.packages * itemReturn.packageQuantity,
                `Devolução a ${itemReturn.supplierName}`, userId]
        );

        await connection.execute(
            `INSERT INTO purchase_returns
                 (event_id, supplier_id, product_id, packages, package_quantity, package_price, return_date, movement_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [eventId, itemReturn.supplierId, itemReturn.productId, itemReturn.packages, itemReturn.packageQuantity,
                itemReturn.packagePrice, itemReturn.returnDate, movement.insertId, userId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Apaga uma devolução registada por engano: as embalagens voltam ao stock
async function deleteReturn(returnId, movementId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM purchase_returns WHERE return_id = ?', [returnId]);

        if (movementId) {
            await connection.execute('DELETE FROM stock_movements WHERE movement_id = ?', [movementId]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    findReturnsByEvent,
    findReturnableLines,
    sumReturnsByEvent,
    findReturnInEvent,
    createReturn,
    deleteReturn
};
