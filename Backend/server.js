// server.js: ponto de partida do servidor da aplicação Bebe e Siga.

// 1. Ir buscar o Express, que instalámos com o npm
const express = require('express');

// 2. Criar a aplicação (o nosso servidor)
const app = express();

// 3. Porta onde o servidor fica à espera de pedidos
const PORT = 3000;

// 4. Permitir que o servidor leia os dados em JSON enviados pelas páginas
app.use(express.json());

// 5. Rota de teste: serve só para confirmar que o servidor está a funcionar
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'O servidor Bebe e Siga está a funcionar.' });
});

// 6. Ligar o servidor
app.listen(PORT, () => {
    console.log(`Servidor a funcionar em http://localhost:${PORT}`);
});
