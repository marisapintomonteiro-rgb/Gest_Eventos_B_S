// middleware/eventMiddleware.js: prazo de edição de cada evento (RF26).
// Um evento pode ser alterado até um mês depois do último dia. Depois disso fica só para consulta;
// o histórico continua disponível sem limite de tempo.

const eventModel = require('../models/eventModel');

// Último dia em que o evento ainda pode ser alterado (AAAA-MM-DD): o último dia do evento + 1 mês
function getEditDeadline(lastDay) {
    if (!lastDay) {
        return null;
    }

    const date = new Date(`${lastDay}T12:00:00Z`);
    const day = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + 1);

    // Ex.: 31 de janeiro + 1 mês = 28 de fevereiro (e não 3 de março)
    if (date.getUTCDate() !== day) {
        date.setUTCDate(0);
    }

    return date.toISOString().slice(0, 10);
}

// Data AAAA-MM-DD escrita à portuguesa (DD/MM/AAAA), para as mensagens
function formatDate(text) {
    return text ? text.split('-').reverse().join('/') : '';
}

// Indica se o evento ainda está dentro do prazo de edição (comparando com o dia de hoje)
function isEventEditable(lastDay, today = new Date().toLocaleDateString('sv-SE')) {
    const deadline = getEditDeadline(lastDay);
    return deadline === null || today <= deadline;
}

// Só deixa passar os pedidos que alteram um evento dentro do prazo. Usado nas rotas de escrita.
async function requireEditableEvent(req, res, next) {
    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (event && !isEventEditable(event.last_day)) {
            return res.status(403).json({
                error: `O prazo de edição deste evento terminou a ${formatDate(getEditDeadline(event.last_day))} (um mês depois do último dia). Fica só para consulta.`
            });
        }

        // Se o evento não existir, o controller responde com o erro certo
        next();
    } catch (error) {
        console.error('Erro ao confirmar o prazo do evento:', error.message);
        res.status(500).json({ error: 'Não foi possível confirmar o prazo do evento. Tenta novamente.' });
    }
}

module.exports = { getEditDeadline, isEventEditable, formatDate, requireEditableEvent };
