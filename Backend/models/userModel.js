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

// Cria uma conta numa marca. Devolve o número (user_id) da conta nova.
async function createUser(brandId, email, passwordHash, role) {
    const [result] = await pool.execute(
        'INSERT INTO users (brand_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [brandId, email, passwordHash, role]
    );
    return result.insertId;
}

// Remove uma conta, mas só se pertencer à marca indicada.
// Devolve true se removeu, false se não encontrou a conta nessa marca.
async function deleteUser(userId, brandId) {
    const [result] = await pool.execute(
        'DELETE FROM users WHERE user_id = ? AND brand_id = ?',
        [userId, brandId]
    );
    return result.affectedRows > 0;
}

module.exports = { findUserByEmail, findUsersByBrand, createUser, deleteUser };