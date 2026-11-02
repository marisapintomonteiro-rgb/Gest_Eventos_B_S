// config/database.js: ligação à base de dados MySQL.
// Os dados de acesso vêm do ficheiro .env e nunca são escritos aqui.

const mysql = require('mysql2/promise');

// Um "pool" é um conjunto de ligações prontas a usar, partilhadas por todos os pedidos
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Devolve as datas como texto (ex.: '2027-07-15'), para não mudarem de dia por causa do fuso horário
    dateStrings: true
});

module.exports = pool;