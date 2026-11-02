// config/database.js: ligação à base de dados MySQL.
// Os dados de acesso vêm do ficheiro .env e nunca são escritos aqui.

const mysql = require('mysql2/promise');

// Ligação segura (SSL), só quando a base de dados está online (ex.: Aiven).
// DB_SSL_CA tem o certificado do serviço; no computador de cada um fica vazio.
function getSslOptions() {
    if (!process.env.DB_SSL_CA) {
        return undefined;
    }

    return { ca: normalizeCertificate(process.env.DB_SSL_CA) };
}

// Quando o certificado é colado num campo de uma só linha, as mudanças de linha perdem-se
// (ficam espaços ou "\n"). Aqui volta a ficar no formato certo: cabeçalho, linhas de 64 caracteres e fim.
function normalizeCertificate(text) {
    const match = text.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);

    if (!match) {
        return text;
    }

    const body = match[1].replace(/\\n|\s/g, '');
    const lines = body.match(/.{1,64}/g).join('\n');
    return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

const connectionOptions = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getSslOptions(),
    // Devolve as datas como texto (ex.: '2027-07-15'), para não mudarem de dia por causa do fuso horário
    dateStrings: true
};

// Um "pool" é um conjunto de ligações prontas a usar, partilhadas por todos os pedidos
const pool = mysql.createPool(connectionOptions);

module.exports = pool;
module.exports.connectionOptions = connectionOptions;
