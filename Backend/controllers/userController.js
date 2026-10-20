// controllers/userController.js: gestão das contas da marca (UC02, só para o Administrador).

const userModel = require('../models/userModel');

// GET /api/users: lista as contas da marca de quem tem a sessão aberta (RF02)
async function listUsers(req, res) {
    try {
        const users = await userModel.findUsersByBrand(req.session.user.brandId);
        res.json({ users });
    } catch (error) {
        console.error('Erro ao listar os utilizadores:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os utilizadores. Tenta novamente.' });
    }
}

module.exports = { listUsers };