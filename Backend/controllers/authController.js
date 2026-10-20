// controllers/authController.js: registo da marca, entrada e saída.
// Valida os dados recebidos, protege as palavras-passe e pede aos models para gravar.

const bcrypt = require('bcrypt');
const brandModel = require('../models/brandModel');
const userModel = require('../models/userModel');

const ROLES = ['Administrador', 'Gestor', 'Colaborador'];
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

// A mesma mensagem para email desconhecido e palavra-passe errada, para não revelar que emails existem
const LOGIN_ERROR = 'Email ou palavra-passe incorretos.';

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

// POST /api/auth/login: inicia sessão (RF01, UC01)
async function login(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!isValidEmail(email) || password.length === 0) {
        return res.status(400).json({ error: 'Indica o email e a palavra-passe.' });
    }

    try {
        const user = await userModel.findUserByEmail(email);
        const isPasswordCorrect = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: LOGIN_ERROR });
        }

        const brand = await brandModel.findBrandById(user.brand_id);

        // Dá uma "pulseira" nova a quem acabou de entrar
        req.session.regenerate((error) => {
            if (error) {
                console.error('Erro ao criar a sessão:', error.message);
                return res.status(500).json({ error: 'Não foi possível iniciar sessão. Tenta novamente.' });
            }

            req.session.user = {
                userId: user.user_id,
                brandId: user.brand_id,
                email: user.email,
                role: user.role
            };

            res.json({ user: { ...req.session.user, brandName: brand.brand_name } });
        });
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error.message);
        res.status(500).json({ error: 'Não foi possível iniciar sessão. Tenta novamente.' });
    }
}

// GET /api/auth/me: diz quem tem a sessão aberta (as páginas usam isto ao abrir)
async function getCurrentUser(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Não tens sessão iniciada.' });
    }

    try {
        const brand = await brandModel.findBrandById(req.session.user.brandId);
        res.json({ user: { ...req.session.user, brandName: brand.brand_name } });
    } catch (error) {
        console.error('Erro ao ler a sessão:', error.message);
        res.status(500).json({ error: 'Não foi possível ler a sessão. Tenta novamente.' });
    }
}

// POST /api/auth/logout: termina a sessão (RF01)
function logout(req, res) {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Sessão terminada.' });
    });
}

module.exports = { registerBrand, login, getCurrentUser, logout };
