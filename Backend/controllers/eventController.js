// controllers/eventController.js: criar e listar eventos (US01: RF04 e RF05, UC04 e UC05).
// Valida os dados recebidos e pede ao eventModel para gravar.

const eventModel = require('../models/eventModel');
const { getEditDeadline, isEventEditable, formatDate } = require('../middleware/eventMiddleware');

const SPACE_TYPES = ['Interior', 'Exterior', 'Misto'];
const EXPENSE_TYPES = ['Fixa', 'Variável'];

// Data no formato AAAA-MM-DD e que existe mesmo no calendário (ex.: não aceita 2027-02-30)
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return false;
    }

    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

// Hora no formato HH:MM (de 00:00 a 23:59)
function isValidTime(text) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

// Campo opcional: vazio passa a null; caso contrário, transforma em número
function toOptionalNumber(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return Number(value);
}

// Confirma os dados do evento. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
function validateEvent(eventData, days, expenses) {
    if (eventData.eventName.length === 0 || eventData.eventName.length > 100) {
        return 'Indica o nome do evento (até 100 caracteres).';
    }

    if (eventData.location.length === 0 || eventData.location.length > 150) {
        return 'Indica o local do evento (até 150 caracteres).';
    }

    if (eventData.spaceType !== null && !SPACE_TYPES.includes(eventData.spaceType)) {
        return 'O tipo de espaço tem de ser interior, exterior ou misto.';
    }

    if (eventData.expectedAudience !== null &&
        (!Number.isInteger(eventData.expectedAudience) || eventData.expectedAudience < 0)) {
        return 'A previsão de público tem de ser um número inteiro, sem valores negativos.';
    }

    if (eventData.budget !== null && (Number.isNaN(eventData.budget) || eventData.budget < 0)) {
        return 'O orçamento tem de ser um valor sem negativos.';
    }

    if (days.length === 0) {
        return 'Escolhe pelo menos um dia para o evento.';
    }

    const seenDates = [];

    for (const day of days) {
        if (!isValidDate(day.date)) {
            return 'Um dos dias não tem uma data válida.';
        }

        if (seenDates.includes(day.date)) {
            return `O dia ${day.date} aparece mais do que uma vez.`;
        }

        // Cada dia pode ter horário ou não; se tiver, precisa da hora de início e da hora de fim
        const hasStart = day.startTime !== null;
        const hasEnd = day.endTime !== null;

        if (hasStart !== hasEnd) {
            return `No dia ${day.date}, indica a hora de início e a hora de fim, ou deixa as duas vazias.`;
        }

        if (hasStart && (!isValidTime(day.startTime) || !isValidTime(day.endTime))) {
            return `No dia ${day.date}, as horas têm de estar no formato HH:MM.`;
        }

        if (day.revenueTarget !== null && (Number.isNaN(day.revenueTarget) || day.revenueTarget < 0)) {
            return `No dia ${day.date}, o objetivo de faturação tem de ser um valor sem negativos.`;
        }

        seenDates.push(day.date);
    }

    for (const expense of expenses) {
        if (expense.description.length === 0 || expense.description.length > 150) {
            return 'Cada despesa precisa de uma descrição (até 150 caracteres).';
        }

        if (!EXPENSE_TYPES.includes(expense.type)) {
            return 'Cada despesa tem de ser fixa ou variável.';
        }

        if (Number.isNaN(expense.amount) || expense.amount <= 0) {
            return `O valor da despesa "${expense.description}" tem de ser maior do que zero.`;
        }
    }

    return null;
}

// Lê os dados do evento, os dias e as despesas que vieram no pedido
function readEventBody(body) {
    const eventData = {
        eventName: String(body.eventName || '').trim(),
        location: String(body.location || '').trim(),
        spaceType: body.spaceType ? String(body.spaceType) : null,
        expectedAudience: toOptionalNumber(body.expectedAudience),
        budget: toOptionalNumber(body.budget)
    };

    const days = (Array.isArray(body.days) ? body.days : []).map((day) => ({
        date: String(day.date || ''),
        startTime: day.startTime ? String(day.startTime).slice(0, 5) : null,
        endTime: day.endTime ? String(day.endTime).slice(0, 5) : null,
        revenueTarget: toOptionalNumber(day.revenueTarget)
    }));

    const expenses = (Array.isArray(body.expenses) ? body.expenses : []).map((expense) => ({
        description: String(expense.description || '').trim(),
        type: String(expense.type || ''),
        amount: Number(expense.amount)
    }));

    return { eventData, days, expenses };
}

// POST /api/events: cria um evento com os seus dias e as despesas iniciais (US01)
async function createEvent(req, res) {
    const { eventData, days, expenses } = readEventBody(req.body);
    const errorMessage = validateEvent(eventData, days, expenses);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const { brandId, userId } = req.session.user;
        const eventId = await eventModel.createEvent(brandId, userId, eventData, days, expenses);
        res.status(201).json({ eventId, message: 'Evento criado.' });
    } catch (error) {
        console.error('Erro ao criar o evento:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o evento. Tenta novamente.' });
    }
}

// GET /api/events/:eventId: dados do evento para o formulário de edição (Gestor e Administrador)
async function getEvent(req, res) {
    try {
        const event = await eventModel.findEventDetails(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        res.json({ event });
    } catch (error) {
        console.error('Erro ao ler o evento:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o evento. Tenta novamente.' });
    }
}

// PUT /api/events/:eventId: alterar o evento e os seus dias (as despesas mudam-se no Painel)
async function updateEvent(req, res) {
    const { eventData, days } = readEventBody(req.body);
    const errorMessage = validateEvent(eventData, days, []);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        // Um dia com vendas, saídas de stock ou despesas não pode desaparecer (o histórico ficava sem dia)
        const datesWithRecords = await eventModel.findDaysWithRecords(event.event_id);
        const newDates = days.map((day) => day.date);
        const blocked = datesWithRecords.filter((date) => !newDates.includes(date));

        if (blocked.length > 0) {
            const list = blocked.map((date) => date.split('-').reverse().join('/')).join(', ');
            return res.status(400).json({ error: `O dia ${list} já tem registos (vendas, saídas de stock ou despesas) e não pode ser retirado.` });
        }

        await eventModel.updateEvent(event.event_id, eventData, days);
        res.json({ message: `O evento "${eventData.eventName}" foi alterado.` });
    } catch (error) {
        console.error('Erro ao alterar o evento:', error.message);
        res.status(500).json({ error: 'Não foi possível alterar o evento. Tenta novamente.' });
    }
}

// GET /api/events: lista os eventos da marca de quem tem a sessão aberta
async function listEvents(req, res) {
    try {
        const events = await eventModel.findEventsByBrand(req.session.user.brandId);

        // Cada evento leva o prazo de edição (RF26), para as páginas mostrarem "só consulta"
        const withDeadline = events.map((event) => ({
            ...event,
            edit_deadline: getEditDeadline(event.last_day),
            is_editable: isEventEditable(event.last_day)
        }));

        res.json({ events: withDeadline });
    } catch (error) {
        console.error('Erro ao listar os eventos:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os eventos. Tenta novamente.' });
    }
}

// GET /api/events/:eventId/days: dias do evento, com a indicação de fechado (todos os perfis)
async function listDays(req, res) {
    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const days = await eventModel.findDaysByEvent(event.event_id);
        res.json({ event, days });
    } catch (error) {
        console.error('Erro ao listar os dias:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os dias do evento. Tenta novamente.' });
    }
}

// Lê o evento e o dia do endereço e confirma que são da marca de quem tem a sessão
async function findEventDay(req) {
    const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
    return event ? eventModel.findDayInEvent(event.event_id, Number(req.params.dayId)) : null;
}

// POST /api/events/:eventId/days/:dayId/close: fechar o dia (Gestor e Administrador, RF19)
async function closeDay(req, res) {
    try {
        const day = await findEventDay(req);

        if (!day) {
            return res.status(404).json({ error: 'Este dia não existe neste evento.' });
        }

        if (day.is_closed) {
            return res.status(400).json({ error: 'Este dia já está fechado.' });
        }

        await eventModel.closeDay(day.event_day_id, req.session.user.userId);
        res.json({ message: 'Dia fechado. Já não aceita novas vendas nem saídas de stock.' });
    } catch (error) {
        console.error('Erro ao fechar o dia:', error.message);
        res.status(500).json({ error: 'Não foi possível fechar o dia. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/days/:dayId/reopen: reabrir o dia para corrigir (Gestor e Administrador)
async function reopenDay(req, res) {
    try {
        const day = await findEventDay(req);

        if (!day) {
            return res.status(404).json({ error: 'Este dia não existe neste evento.' });
        }

        if (!day.is_closed) {
            return res.status(400).json({ error: 'Este dia já está aberto.' });
        }

        // Depois do encerramento já não se reabrem dias; os acertos fazem-se com correções e devoluções
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (event.is_closed) {
            return res.status(400).json({ error: 'O evento já está encerrado: os dias não podem ser reabertos. Usa a correção de stock.' });
        }

        await eventModel.reopenDay(day.event_day_id);
        res.json({ message: 'Dia reaberto. Depois de corrigir, volta a fechá-lo.' });
    } catch (error) {
        console.error('Erro ao reabrir o dia:', error.message);
        res.status(500).json({ error: 'Não foi possível reabrir o dia. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/close: encerrar o evento (RF25). Só com todos os dias fechados.
async function closeEvent(req, res) {
    try {
        const event = await eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        if (event.is_closed) {
            return res.status(400).json({ error: 'Este evento já está encerrado.' });
        }

        const days = await eventModel.findDaysByEvent(event.event_id);
        const openDays = days.filter((day) => !day.is_closed);

        if (openDays.length > 0) {
            return res.status(400).json({ error: `Antes de encerrar, fecha todos os dias (faltam ${openDays.length}).` });
        }

        await eventModel.closeEvent(event.event_id, req.session.user.userId);
        res.json({ message: `Evento encerrado. Ainda podes fazer correções e devoluções até ${formatDate(getEditDeadline(event.last_day))}.` });
    } catch (error) {
        console.error('Erro ao encerrar o evento:', error.message);
        res.status(500).json({ error: 'Não foi possível encerrar o evento. Tenta novamente.' });
    }
}

module.exports = { createEvent, getEvent, updateEvent, listEvents, listDays, closeDay, reopenDay, closeEvent };