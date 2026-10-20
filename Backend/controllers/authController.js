// controllers/authController.js: registo da marca (e, mais tarde, entrada e saída).
// Valida os dados recebidos, protege as palavras-passe e pede aos models para gravar.

const bcrypt = require('bcrypt');
const brandModel = require('../models/brandModel');
const userModel = require('../models/userModel');

const ROLES = ['Administrador', 'Gestor', 'Colaborador'];
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Limpa os dados de uma conta recebida: tira espaços e põe o email em minúsculas
function normalizeUser(user) {
    return {
        role: String(user.role || ''),
        email: String(user.email || '').trim().toLowerCase(),
        password: String(user.password || '')
    };
}

// Confirma os dados do registo. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
async function validateRegistration(brandName, users) {
    if (brandName.length < 2 || brandName.length > 60) {
        return 'O nome da marca tem de ter entre 2 e 60 caracteres.';
    }

    if (await brandModel.findBrandByName(brandName)) {
        return 'Já existe uma marca registada com este nome.';
    }

    if (!users.some((user) => user.role === 'Administrador')) {
        return 'A marca tem de ter uma conta de Administrador.';
    }

    const seenRoles = [];
    const seenEmails = [];

    for (const user of users) {
        if (!ROLES.includes(user.role)) {
            return `Função desconhecida: ${user.role}.`;
        }

        if (seenRoles.includes(user.role)) {
            return `A função ${user.role} aparece mais do que uma vez.`;
        }

        if (!isValidEmail(user.email)) {
            return `Indica um email válido para a função ${user.role}.`;
        }

        if (seenEmails.includes(user.email)) {
            return 'Usa um email diferente para cada função.';
        }

        if (await userModel.findUserByEmail(user.email)) {
            return `O email ${user.email} já está associado a outra conta.`;
        }

        if (user.password.length < MIN_PASSWORD_LENGTH) {
            return `A palavra-passe da função ${user.role} tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
        }

        seenRoles.push(user.role);
        seenEmails.push(user.email);
    }

    return null;
}

// POST /api/auth/register: regista uma marca nova com as suas contas (RF31, UC03)
async function registerBrand(req, res) {
    const brandName = String(req.body.brandName || '').trim();
    const users = Array.isArray(req.body.users) ? req.body.users.map(normalizeUser) : [];

    try {
        const errorMessage = await validateRegistration(brandName, users);

        if (errorMessage) {
            return res.status(400).json({ error: errorMessage });
        }

        // Guarda só o hash de cada palavra-passe, nunca a palavra-passe em si
        const usersToSave = [];

        for (const user of users) {
            usersToSave.push({
                role: user.role,
                email: user.email,
                passwordHash: await bcrypt.hash(user.password, BCRYPT_ROUNDS)
            });
        }

        const brandId = await brandModel.createBrandWithUsers(brandName, usersToSave);
        res.status(201).json({ brandId, message: 'Marca registada.' });
    } catch (error) {
        console.error('Erro ao registar a marca:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a marca. Tenta novamente.' });
    }
}

module.exports = { registerBrand };