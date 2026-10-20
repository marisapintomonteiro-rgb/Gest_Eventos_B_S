// middleware/authMiddleware.js: o "segurança à porta".
// Confirma a sessão e o perfil antes de o pedido chegar ao controller (RBAC, RF03, RNF07).

// Nível de cada perfil: um nível mais alto inclui as permissões dos níveis abaixo
const ROLE_LEVELS = {
    Colaborador: 1,
    Gestor: 2,
    Administrador: 3
};

// Só deixa passar quem tem sessão iniciada
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Tens de iniciar sessão.' });
    }

    next();
}

// Só deixa passar quem tem, pelo menos, o perfil indicado (ex.: requireRole('Gestor'))
function requireRole(minimumRole) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Tens de iniciar sessão.' });
        }

        const userLevel = ROLE_LEVELS[req.session.user.role] || 0;

        if (userLevel < ROLE_LEVELS[minimumRole]) {
            return res.status(403).json({ error: 'Não tens permissão para fazer isto.' });
        }

        next();
    };
}

module.exports = { requireLogin, requireRole };