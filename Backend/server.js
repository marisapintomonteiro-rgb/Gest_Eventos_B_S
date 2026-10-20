// server.js: ponto de partida do servidor da aplicação Bebe e Siga.

// 0. Ler as configurações do ficheiro .env (tem de ser a primeira coisa a fazer)
require('dotenv').config();

// 1. Ir buscar o Express, as sessões, a ligação à base de dados e as routes
const express = require('express');
const session = require('express-session');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');

// 2. Criar a aplicação (o nosso servidor)
const app = express();

// 3. Porta onde o servidor fica à espera de pedidos (vem do .env)
const PORT = process.env.PORT || 3000;

// 4. Permitir que o servidor leia os dados em JSON enviados pelas páginas
app.use(express.json());

// Sessões: a "pulseira" (cookie) que lembra quem fez login.
// Termina ao fim de 30 minutos sem atividade (RNF08).
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000
    }
}));

// Endereços da API de acesso: /api/auth/...
app.use('/api/auth', authRoutes);

// 5. Rota de teste: confirma que o servidor e a base de dados estão a funcionar
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        res.json({ status: 'ok', database: 'ligada', message: 'O servidor Bebe e Siga está a funcionar.' });
    } catch (error) {
        console.error('Não foi possível ligar à base de dados:', error.message);
        res.status(500).json({ error: 'O servidor está a funcionar, mas não consegue ligar à base de dados.' });
    }
});

// 6. Ligar o servidor
app.listen(PORT, () => {
    console.log(`Servidor a funcionar em http://localhost:${PORT}`);
});