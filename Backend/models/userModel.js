// models/userModel.js: lê e grava as contas de acesso na base de dados.

const pool = require('../config/database');

// Procura uma conta pelo email. Devolve a conta, ou null se não existir.
async function findUserByEmail(email) {
    const [rows] = await pool.execute(
        'SELECT user_id, brand_id, email, password_hash, role FROM users WHERE email = ?',
        [email]
    );
    return rows[0] || null;
}

// Lista as contas de uma marca (sem o hash da palavra-passe)
async function findUsersByBrand(brandId) {
    const [rows] = await pool.execute(
        'SELECT user_id, email, role, created_at FROM users WHERE brand_id = ? ORDER BY created_at',
        [brandId]
    );
    return rows;
}

module.exports = { findUserByEmail, findUsersByBrand };