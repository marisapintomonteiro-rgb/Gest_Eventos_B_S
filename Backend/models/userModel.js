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

// Procura uma conta pelo número (com o hash, para confirmar a palavra-passe atual)
async function findUserById(userId) {
    const [rows] = await pool.execute(
        'SELECT user_id, brand_id, email, password_hash, role FROM users WHERE user_id = ?',
        [userId]
    );
    return rows[0] || null;
}

// Indica se a conta tem uma palavra-passe temporária (posta pelo Administrador)
async function hasTemporaryPassword(userId) {
    const [rows] = await pool.execute('SELECT user_id FROM password_resets WHERE user_id = ?', [userId]);
    return rows.length > 0;
}

// O Administrador repõe a palavra-passe de uma conta da sua marca: fica temporária.
// Devolve false se a conta não for desta marca.
async function resetPassword(userId, brandId, passwordHash, adminId) {
    const [result] = await pool.execute(
        'UPDATE users SET password_hash = ? WHERE user_id = ? AND brand_id = ?',
        [passwordHash, userId, brandId]
    );

    if (result.affectedRows === 0) {
        return false;
    }

    await pool.execute(
        'REPLACE INTO password_resets (user_id, reset_by) VALUES (?, ?)',
        [userId, adminId]
    );
    return true;
}

// A própria pessoa muda a palavra-passe: deixa de ser temporária
async function changePassword(userId, passwordHash) {
    await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);
}

module.exports = {
    findUserByEmail,
    findUserById,
    findUsersByBrand,
    createUser,
    deleteUser,
    hasTemporaryPassword,
    resetPassword,
    changePassword
};