// server.js: ponto de partida do servidor da aplicação Bebe e Siga.

// 0. Ler as configurações do ficheiro .env (tem de ser a primeira coisa a fazer)
require('dotenv').config();

// 1. Ir buscar o Express, as sessões, a ligação à base de dados e as routes
const express = require('express');
const path = require('path');
const session = require('express-session');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const menuRoutes = require('./routes/menuRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const stockRoutes = require('./routes/stockRoutes');
const noteRoutes = require('./routes/noteRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const returnRoutes = require('./routes/returnRoutes');

// 2. Criar a aplicação (o nosso servidor)
const app = express();

// 3. Porta onde o servidor fica à espera de pedidos (vem do .env)
const PORT = process.env.PORT || 3000;

// 4. Permitir que o servidor leia os dados em JSON enviados pelas páginas
app.use(express.json());

// Mostrar as páginas da pasta Frontend (ex.: http://localhost:3000/login.html)
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

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

// Endereços da API de utilizadores: /api/users/...
app.use('/api/users', userRoutes);

// Endereços da API de eventos: /api/events/...
app.use('/api/events', eventRoutes);

// Endereços da API da ementa de cada evento: /api/events/:eventId/menu/...
app.use('/api/events/:eventId/menu', menuRoutes);

// Endereços da API das compras de cada evento: /api/events/:eventId/purchases/...
app.use('/api/events/:eventId/purchases', purchaseRoutes);

// Endereços da API das vendas de cada evento: /api/events/:eventId/sales/...
app.use('/api/events/:eventId/sales', saleRoutes);

// Endereços da API do stock de cada evento: /api/events/:eventId/stock/...
app.use('/api/events/:eventId/stock', stockRoutes);

// Endereços da API das notas de cada evento: /api/events/:eventId/notes/...
app.use('/api/events/:eventId/notes', noteRoutes);

// Despesas e dashboard de cada evento
app.use('/api/events/:eventId/expenses', expenseRoutes);
app.use('/api/events/:eventId', dashboardRoutes);
app.use('/api/events/:eventId/returns', returnRoutes);

// Endereços da API de fornecedores e produtos: /api/suppliers/... e /api/products/...
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);

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