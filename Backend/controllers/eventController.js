// controllers/eventController.js: criar e listar eventos (US01: RF04 e RF05, UC04 e UC05).
// Valida os dados recebidos e pede ao eventModel para gravar.

const eventModel = require('../models/eventModel');

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

// POST /api/events: cria um evento com os seus dias e as despesas iniciais (US01)
async function createEvent(req, res) {
    const body = req.body;

    const eventData = {
        eventName: String(body.eventName || '').trim(),
        location: String(body.location || '').trim(),
        spaceType: body.spaceType ? String(body.spaceType) : null,
        expectedAudience: toOptionalNumber(body.expectedAudience),
        budget: toOptionalNumber(body.budget)
    };

    const days = (Array.isArray(body.days) ? body.days : []).map((day) => ({
        date: String(day.date || ''),
        startTime: day.startTime ? String(day.startTime) : null,
        endTime: day.endTime ? String(day.endTime) : null
    }));

    const expenses = (Array.isArray(body.expenses) ? body.expenses : []).map((expense) => ({
        description: String(expense.description || '').trim(),
        type: String(expense.type || ''),
        amount: Number(expense.amount)
    }));

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

// GET /api/events: lista os eventos da marca de quem tem a sessão aberta
async function listEvents(req, res) {
    try {
        const events = await eventModel.findEventsByBrand(req.session.user.brandId);
        res.json({ events });
    } catch (error) {
        console.error('Erro ao listar os eventos:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os eventos. Tenta novamente.' });
    }
}

module.exports = { createEvent, listEvents };