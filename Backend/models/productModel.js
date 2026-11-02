// models/productModel.js: lê e grava os produtos, os seus fornecedores e o histórico de preços (RF07, RF11).

const pool = require('../config/database');

// Lista os produtos de uma marca, cada um com os seus fornecedores e o preço mais recente de cada fornecedor
async function findProductsByBrand(brandId) {
    const [products] = await pool.execute(
        `SELECT product_id, product_name, unit, package_quantity, min_stock, is_perishable, is_residual
         FROM products
         WHERE brand_id = ?
         ORDER BY product_name`,
        [brandId]
    );

    // O preço mais recente é a última linha do histórico desse produto com esse fornecedor
    const [links] = await pool.execute(
        `SELECT ps.product_id, ps.supplier_id, ps.is_main, s.supplier_name,
                (SELECT pp.package_price FROM product_prices pp
                 WHERE pp.product_id = ps.product_id AND pp.supplier_id = ps.supplier_id
                 ORDER BY pp.created_at DESC, pp.price_id DESC LIMIT 1) AS latest_price,
                (SELECT pp.created_at FROM product_prices pp
                 WHERE pp.product_id = ps.product_id AND pp.supplier_id = ps.supplier_id
                 ORDER BY pp.created_at DESC, pp.price_id DESC LIMIT 1) AS latest_price_date
         FROM product_suppliers ps
         JOIN products p ON p.product_id = ps.product_id
         JOIN suppliers s ON s.supplier_id = ps.supplier_id
         WHERE p.brand_id = ?
         ORDER BY ps.is_main DESC, s.supplier_name`,
        [brandId]
    );

    return products.map((product) => ({
        ...product,
        suppliers: links.filter((link) => link.product_id === product.product_id)
    }));
}

// Procura um produto pelo nome, dentro de uma marca (para não haver dois produtos com o mesmo nome)
async function findProductByName(brandId, productName) {
    const [rows] = await pool.execute(
        'SELECT product_id FROM products WHERE brand_id = ? AND product_name = ?',
        [brandId, productName]
    );
    return rows[0] || null;
}

// Confirma que o produto é desta marca e que o fornecedor está ligado a ele
async function findProductSupplierLink(brandId, productId, supplierId) {
    const [rows] = await pool.execute(
        `SELECT ps.product_id
         FROM product_suppliers ps
         JOIN products p ON p.product_id = ps.product_id
         WHERE p.brand_id = ? AND ps.product_id = ? AND ps.supplier_id = ?`,
        [brandId, productId, supplierId]
    );
    return rows[0] || null;
}

// Grava o produto, os fornecedores e o primeiro preço de cada um, de uma só vez (transação)
async function createProduct(brandId, userId, product, suppliers) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO products (brand_id, product_name, unit, package_quantity, min_stock, is_perishable, is_residual)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [brandId, product.productName, product.unit, product.packageQuantity, product.minStock,
                product.isPerishable, product.isResidual]
        );
        const productId = result.insertId;

        for (const supplier of suppliers) {
            await connection.execute(
                'INSERT INTO product_suppliers (product_id, supplier_id, is_main) VALUES (?, ?, ?)',
                [productId, supplier.supplierId, supplier.isMain]
            );

            if (supplier.packagePrice !== null) {
                await connection.execute(
                    'INSERT INTO product_prices (product_id, supplier_id, package_price, created_by) VALUES (?, ?, ?, ?)',
                    [productId, supplier.supplierId, supplier.packagePrice, userId]
                );
            }
        }

        await connection.commit();
        return productId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Junta um preço novo ao histórico (os anteriores ficam como estão)
async function addPrice(productId, supplierId, packagePrice, userId) {
    await pool.execute(
        'INSERT INTO product_prices (product_id, supplier_id, package_price, created_by) VALUES (?, ?, ?, ?)',
        [productId, supplierId, packagePrice, userId]
    );
}

// Histórico de preços de um produto (de todos os fornecedores), do mais recente para o mais antigo
async function findPriceHistory(brandId, productId) {
    const [rows] = await pool.execute(
        `SELECT pp.price_id, pp.package_price, pp.created_at, s.supplier_name
         FROM product_prices pp
         JOIN products p ON p.product_id = pp.product_id
         JOIN suppliers s ON s.supplier_id = pp.supplier_id
         WHERE p.brand_id = ? AND pp.product_id = ?
         ORDER BY pp.created_at DESC, pp.price_id DESC`,
        [brandId, productId]
    );
    return rows;
}

module.exports = {
    findProductsByBrand,
    findProductByName,
    findProductSupplierLink,
    createProduct,
    addPrice,
    findPriceHistory
};
