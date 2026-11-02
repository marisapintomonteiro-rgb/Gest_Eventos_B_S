// controllers/userController.js: gestão das contas da marca (UC02, só para o Administrador).

const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const ROLES = ['Administrador', 'Gestor', 'Colaborador'];
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

// POST /api/users: cria uma conta na marca de quem tem a sessão aberta (RF02)
async function createUser(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || '');

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Indica um email válido.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    if (!ROLES.includes(role)) {
        return res.status(400).json({ error: 'Escolhe o perfil.' });
    }

    try {
        if (await userModel.findUserByEmail(email)) {
            return res.status(400).json({ error: 'Este email já está associado a uma conta.' });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const userId = await userModel.createUser(req.session.user.brandId, email, passwordHash, role);
        res.status(201).json({ userId, message: `${email} já pode entrar como ${role}.` });
    } catch (error) {
        console.error('Erro ao criar o utilizador:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o utilizador. Tenta novamente.' });
    }
}

// DELETE /api/users/:id: remove uma conta da marca (RF02)
async function removeUser(req, res) {
    const userId = Number(req.params.id);

    // Ninguém remove o próprio acesso: assim a marca fica sempre com um Administrador
    if (userId === req.session.user.userId) {
        return res.status(400).json({ error: 'Não podes remover o teu próprio acesso.' });
    }

    try {
        const wasRemoved = await userModel.deleteUser(userId, req.session.user.brandId);

        if (!wasRemoved) {
            return res.status(404).json({ error: 'Esta conta não existe nesta marca.' });
        }

        res.json({ message: 'Acesso removido.' });
    } catch (error) {
        console.error('Erro ao remover o utilizador:', error.message);
        res.status(500).json({ error: 'Não foi possível remover o utilizador. Tenta novamente.' });
    }
}

// POST /api/users/:id/password: o Administrador repõe a palavra-passe de uma conta da marca.
// A palavra-passe fica temporária: a pessoa tem de a mudar quando entrar.
async function resetPassword(req, res) {
    const userId = Number(req.params.id);
    const password = String(req.body.password || '');

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `A palavra-passe temporária tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    // A própria palavra-passe muda-se em "A minha conta", com a palavra-passe atual
    if (userId === req.session.user.userId) {
        return res.status(400).json({ error: 'Para mudares a tua palavra-passe, usa "A minha conta".' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const wasReset = await userModel.resetPassword(userId, req.session.user.brandId, passwordHash, req.session.user.userId);

        if (!wasReset) {
            return res.status(404).json({ error: 'Esta conta não existe nesta marca.' });
        }

        res.json({ message: 'Palavra-passe reposta. Diz a palavra-passe temporária à pessoa: vai ter de a mudar quando entrar.' });
    } catch (error) {
        console.error('Erro ao repor a palavra-passe:', error.message);
        res.status(500).json({ error: 'Não foi possível repor a palavra-passe. Tenta novamente.' });
    }
}

module.exports = { listUsers, createUser, removeUser, resetPassword };