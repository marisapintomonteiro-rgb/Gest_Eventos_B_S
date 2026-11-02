// models/menuModel.js: lê e grava a ementa de cada evento e o que sai do stock em cada artigo (RF08, RF09, RF10).

const pool = require('../config/database');

// Ementa de um evento: os artigos e, em cada um, os produtos que saem do stock
async function findMenuByEvent(eventId) {
    const [items] = await pool.execute(
        `SELECT menu_item_id, item_name, category, price, item_type
         FROM menu_items
         WHERE event_id = ?
         ORDER BY FIELD(category, 'Bebidas', 'Cocktails', 'Shots', 'Comida', 'Outros'), item_name`,
        [eventId]
    );

    const [lines] = await pool.execute(
        `SELECT mp.menu_item_id, mp.product_id, mp.quantity, p.product_name, p.unit, p.is_residual
         FROM menu_item_products mp
         JOIN menu_items mi ON mi.menu_item_id = mp.menu_item_id
         JOIN products p ON p.product_id = mp.product_id
         WHERE mi.event_id = ?
         ORDER BY p.product_name`,
        [eventId]
    );

    return items.map((item) => ({
        ...item,
        products: lines.filter((line) => line.menu_item_id === item.menu_item_id)
    }));
}

// Procura um artigo pelo nome na ementa do evento (não pode haver dois com o mesmo nome).
// Ao editar, exceptItemId deixa de fora o próprio artigo.
async function findItemByName(eventId, itemName, exceptItemId = 0) {
    const [rows] = await pool.execute(
        'SELECT menu_item_id FROM menu_items WHERE event_id = ? AND item_name = ? AND menu_item_id <> ?',
        [eventId, itemName, exceptItemId]
    );
    return rows[0] || null;
}

// Confirma que o artigo pertence a este evento
async function findItemInEvent(eventId, itemId) {
    const [rows] = await pool.execute(
        'SELECT menu_item_id FROM menu_items WHERE event_id = ? AND menu_item_id = ?',
        [eventId, itemId]
    );
    return rows[0] || null;
}

// Grava as linhas "produto + quantidade" de um artigo (usada ao criar, editar e copiar)
async function insertItemProducts(connection, itemId, products) {
    for (const product of products) {
        await connection.execute(
            'INSERT INTO menu_item_products (menu_item_id, product_id, quantity) VALUES (?, ?, ?)',
            [itemId, product.productId, product.quantity]
        );
    }
}

// Cria um artigo com os seus produtos, de uma só vez (transação)
async function createItem(eventId, item, products) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO menu_items (event_id, item_name, category, price, item_type) VALUES (?, ?, ?, ?, ?)',
            [eventId, item.itemName, item.category, item.price, item.itemType]
        );
        await insertItemProducts(connection, result.insertId, products);

        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Altera um artigo: atualiza os dados e volta a gravar a lista de produtos
async function updateItem(itemId, item, products) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            'UPDATE menu_items SET item_name = ?, category = ?, price = ?, item_type = ? WHERE menu_item_id = ?',
            [item.itemName, item.category, item.price, item.itemType, itemId]
        );
        await connection.execute('DELETE FROM menu_item_products WHERE menu_item_id = ?', [itemId]);
        await insertItemProducts(connection, itemId, products);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Apaga um artigo da ementa (os seus produtos saem com ele: ON DELETE CASCADE)
async function deleteItem(itemId) {
    await pool.execute('DELETE FROM menu_items WHERE menu_item_id = ?', [itemId]);
}

// Copia a ementa de um evento para outro (RF10). Cria linhas novas: o evento original não muda.
// Os artigos com um nome que já existe no evento de destino ficam de fora.
// Devolve quantos artigos foram copiados e quantos ficaram de fora.
async function copyMenu(fromEventId, toEventId) {
    const sourceItems = await findMenuByEvent(fromEventId);
    const connection = await pool.getConnection();
    let copied = 0;

    try {
        await connection.beginTransaction();

        for (const item of sourceItems) {
            const [existing] = await connection.execute(
                'SELECT menu_item_id FROM menu_items WHERE event_id = ? AND item_name = ?',
                [toEventId, item.item_name]
            );

            if (existing.length > 0) {
                continue;
            }

            const [result] = await connection.execute(
                'INSERT INTO menu_items (event_id, item_name, category, price, item_type) VALUES (?, ?, ?, ?, ?)',
                [toEventId, item.item_name, item.category, item.price, item.item_type]
            );
            const products = item.products.map((line) => ({ productId: line.product_id, quantity: line.quantity }));
            await insertItemProducts(connection, result.insertId, products);
            copied += 1;
        }

        await connection.commit();
        return { copied, skipped: sourceItems.length - copied };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    findMenuByEvent,
    findItemByName,
    findItemInEvent,
    createItem,
    updateItem,
    deleteItem,
    copyMenu
};
