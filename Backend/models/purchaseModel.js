// models/purchaseModel.js: lê e grava as compras de cada evento e calcula o stock que elas criam (RF12, RF15).

const pool = require('../config/database');

// Compras de um evento, da mais recente para a mais antiga, cada uma com os seus produtos
async function findPurchasesByEvent(eventId) {
    const [purchases] = await pool.execute(
        `SELECT pu.purchase_id, pu.purchase_date, pu.notes, s.supplier_name
         FROM purchases pu
         JOIN suppliers s ON s.supplier_id = pu.supplier_id
         WHERE pu.event_id = ?
         ORDER BY pu.purchase_date DESC, pu.purchase_id DESC`,
        [eventId]
    );

    const [lines] = await pool.execute(
        `SELECT pl.purchase_id, pl.product_id, pl.packages, pl.package_quantity, pl.package_price, pl.quantity,
                p.product_name, p.unit
         FROM purchase_lines pl
         JOIN purchases pu ON pu.purchase_id = pl.purchase_id
         JOIN products p ON p.product_id = pl.product_id
         WHERE pu.event_id = ?
         ORDER BY p.product_name`,
        [eventId]
    );

    return purchases.map((purchase) => ({
        ...purchase,
        lines: lines.filter((line) => line.purchase_id === purchase.purchase_id)
    }));
}

// Stock do evento: o que entrou com as compras, por produto (as vendas e acertos entram nas próximas etapas)
async function findStockByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT p.product_id, p.product_name, p.unit, p.min_stock, SUM(pl.quantity) AS quantity
         FROM purchase_lines pl
         JOIN purchases pu ON pu.purchase_id = pl.purchase_id
         JOIN products p ON p.product_id = pl.product_id
         WHERE pu.event_id = ?
         GROUP BY p.product_id
         ORDER BY p.product_name`,
        [eventId]
    );
    return rows;
}

// Confirma que a compra pertence a este evento
async function findPurchaseInEvent(eventId, purchaseId) {
    const [rows] = await pool.execute(
        'SELECT purchase_id FROM purchases WHERE event_id = ? AND purchase_id = ?',
        [eventId, purchaseId]
    );
    return rows[0] || null;
}

// Junta o preço da compra ao histórico de preços do produto com este fornecedor, se for diferente do último.
// Se o fornecedor ainda não estava ligado ao produto, liga-o (principal se o produto não tinha nenhum).
async function updatePriceHistory(connection, productId, supplierId, packagePrice, userId) {
    const [links] = await connection.execute(
        'SELECT supplier_id FROM product_suppliers WHERE product_id = ?',
        [productId]
    );

    if (!links.some((link) => link.supplier_id === supplierId)) {
        await connection.execute(
            'INSERT INTO product_suppliers (product_id, supplier_id, is_main) VALUES (?, ?, ?)',
            [productId, supplierId, links.length === 0 ? 1 : 0]
        );
    }

    const [latest] = await connection.execute(
        `SELECT package_price FROM product_prices
         WHERE product_id = ? AND supplier_id = ?
         ORDER BY created_at DESC, price_id DESC LIMIT 1`,
        [productId, supplierId]
    );

    if (latest.length === 0 || Number(latest[0].package_price) !== packagePrice) {
        await connection.execute(
            'INSERT INTO product_prices (product_id, supplier_id, package_price, created_by) VALUES (?, ?, ?, ?)',
            [productId, supplierId, packagePrice, userId]
        );
    }
}

// Grava a compra e os seus produtos e atualiza o histórico de preços, de uma só vez (transação).
// Cada linha já traz o tamanho da embalagem (packageQuantity), lido do produto pelo controller.
async function createPurchase(eventId, userId, purchase, lines) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO purchases (event_id, supplier_id, purchase_date, notes, created_by) VALUES (?, ?, ?, ?, ?)',
            [eventId, purchase.supplierId, purchase.purchaseDate, purchase.notes, userId]
        );

        for (const line of lines) {
            await connection.execute(
                `INSERT INTO purchase_lines (purchase_id, product_id, packages, package_quantity, package_price, quantity)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [result.insertId, line.productId, line.packages, line.packageQuantity, line.packagePrice,
                    line.packages * line.packageQuantity]
            );
            await updatePriceHistory(connection, line.productId, purchase.supplierId, line.packagePrice, userId);
        }

        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Apaga uma compra registada por engano (as linhas saem com ela: ON DELETE CASCADE).
// O histórico de preços fica como está.
async function deletePurchase(purchaseId) {
    await pool.execute('DELETE FROM purchases WHERE purchase_id = ?', [purchaseId]);
}

module.exports = {
    findPurchasesByEvent,
    findStockByEvent,
    findPurchaseInEvent,
    createPurchase,
    deletePurchase
};
