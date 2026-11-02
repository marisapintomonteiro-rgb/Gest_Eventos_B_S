// models/supplierModel.js: lê e grava os fornecedores de cada marca (RF11).

const pool = require('../config/database');

// Lista os fornecedores de uma marca, por ordem alfabética
async function findSuppliersByBrand(brandId) {
    const [rows] = await pool.execute(
        `SELECT supplier_id, supplier_name, contact, email, nif, address, accepts_returns
         FROM suppliers
         WHERE brand_id = ?
         ORDER BY supplier_name`,
        [brandId]
    );
    return rows;
}

// Devolve os números dos fornecedores da lista que pertencem mesmo a esta marca
async function findSupplierIdsOfBrand(brandId, supplierIds) {
    if (supplierIds.length === 0) {
        return [];
    }

    const placeholders = supplierIds.map(() => '?').join(', ');
    const [rows] = await pool.execute(
        `SELECT supplier_id FROM suppliers WHERE brand_id = ? AND supplier_id IN (${placeholders})`,
        [brandId, ...supplierIds]
    );
    return rows.map((row) => row.supplier_id);
}

// Cria um fornecedor. Devolve o número (supplier_id) do fornecedor novo.
async function createSupplier(brandId, supplier) {
    const [result] = await pool.execute(
        `INSERT INTO suppliers (brand_id, supplier_name, contact, email, nif, address, accepts_returns)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [brandId, supplier.supplierName, supplier.contact, supplier.email, supplier.nif,
            supplier.address, supplier.acceptsReturns]
    );
    return result.insertId;
}

// Altera um fornecedor. Só altera se o fornecedor for desta marca; devolve false se não existir.
async function updateSupplier(brandId, supplierId, supplier) {
    const [result] = await pool.execute(
        `UPDATE suppliers
         SET supplier_name = ?, contact = ?, email = ?, nif = ?, address = ?, accepts_returns = ?
         WHERE supplier_id = ? AND brand_id = ?`,
        [supplier.supplierName, supplier.contact, supplier.email, supplier.nif, supplier.address,
            supplier.acceptsReturns, supplierId, brandId]
    );
    return result.affectedRows > 0;
}

module.exports = { findSuppliersByBrand, findSupplierIdsOfBrand, createSupplier, updateSupplier };
