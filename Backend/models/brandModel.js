// models/brandModel.js: lê e grava marcas e as suas contas na base de dados.
// É o único sítio com SQL para estas tabelas. Usa sempre queries parametrizadas (os "?").

const pool = require('../config/database');

// Procura uma marca pelo nome. Devolve a marca, ou null se não existir.
async function findBrandByName(brandName) {
    const [rows] = await pool.execute(
        'SELECT brand_id, brand_name FROM brands WHERE brand_name = ?',
        [brandName]
    );
    return rows[0] || null;
}

// Grava a marca e as suas contas de uma só vez (transação):
// ou fica tudo gravado, ou não fica nada.
async function createBrandWithUsers(brandName, users) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [brandResult] = await connection.execute(
            'INSERT INTO brands (brand_name) VALUES (?)',
            [brandName]
        );
        const brandId = brandResult.insertId;

        for (const user of users) {
            await connection.execute(
                'INSERT INTO users (brand_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [brandId, user.email, user.passwordHash, user.role]
            );
        }

        await connection.commit();
        return brandId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { findBrandByName, createBrandWithUsers };