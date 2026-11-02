// setupDatabase.js: cria as tabelas na base de dados indicada no .env, a partir do Database/bebe_e_siga.sql.
// Serve para preparar uma base de dados nova sem o phpMyAdmin (ex.: quando a aplicação está online).
// Uso: npm run setup-db
// Pode correr mais do que uma vez: o script usa CREATE TABLE IF NOT EXISTS e não apaga dados.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { connectionOptions } = require('./config/database');

async function setupDatabase() {
    const sqlPath = path.join(__dirname, '..', 'Database', 'bebe_e_siga.sql');

    // O CREATE DATABASE e o USE ficam de fora: a base de dados é a do .env (DB_NAME)
    const sql = fs.readFileSync(sqlPath, 'utf8')
        .replace(/CREATE DATABASE[^;]*;/i, '')
        .replace(/USE\s+\w+\s*;/i, '');

    // Os mesmos dados de ligação do servidor, mas a aceitar vários comandos SQL de uma vez
    const connection = await mysql.createConnection({ ...connectionOptions, multipleStatements: true });

    try {
        await connection.query(sql);
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`Base de dados pronta: ${tables.length} tabelas em "${process.env.DB_NAME}".`);
    } finally {
        await connection.end();
    }
}

setupDatabase().catch((error) => {
    console.error('Não foi possível preparar a base de dados:', error.message);
    process.exit(1);
});
