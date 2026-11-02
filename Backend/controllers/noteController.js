// controllers/noteController.js: notas diárias e finais do evento (RF24).
// Todos os perfis leem as notas; o Gestor e o Administrador escrevem e apagam.

const noteModel = require('../models/noteModel');
const eventModel = require('../models/eventModel');

const NOTE_TYPES = ['Meteorologia', 'Afluência', 'Produtos esgotados', 'Excesso de stock', 'Fornecedores',
    'Horário de maior movimento', 'Acontecimento externo', 'Outro'];

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// GET /api/events/:eventId/notes: notas do evento
async function listNotes(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const notes = await noteModel.findNotesByEvent(event.event_id);
        res.json({ notes, noteTypes: NOTE_TYPES });
    } catch (error) {
        console.error('Erro ao ler as notas:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as notas. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/notes: escrever uma nota (com eventDayId: diária; sem: final)
async function createNote(req, res) {
    const noteType = String(req.body.noteType || '');
    const noteText = String(req.body.noteText || '').trim();
    const hasDay = req.body.eventDayId !== undefined && req.body.eventDayId !== null && req.body.eventDayId !== '';

    if (!NOTE_TYPES.includes(noteType)) {
        return res.status(400).json({ error: 'Escolhe o assunto da nota.' });
    }

    if (noteText.length === 0 || noteText.length > 500) {
        return res.status(400).json({ error: 'Escreve a nota (até 500 caracteres).' });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        let dayId = null;

        if (hasDay) {
            const day = await eventModel.findDayInEvent(event.event_id, Number(req.body.eventDayId));

            if (!day) {
                return res.status(400).json({ error: 'Este dia não existe neste evento.' });
            }

            dayId = day.event_day_id;
        }

        await noteModel.createNote(event.event_id, dayId, req.session.user.userId, noteType, noteText);
        res.status(201).json({ message: 'Nota guardada.' });
    } catch (error) {
        console.error('Erro ao guardar a nota:', error.message);
        res.status(500).json({ error: 'Não foi possível guardar a nota. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/notes/:noteId: apagar uma nota
async function deleteNote(req, res) {
    try {
        const event = await findEvent(req);
        const note = event ? await noteModel.findNoteInEvent(event.event_id, Number(req.params.noteId)) : null;

        if (!note) {
            return res.status(404).json({ error: 'Esta nota não existe.' });
        }

        await noteModel.deleteNote(note.note_id);
        res.json({ message: 'Nota apagada.' });
    } catch (error) {
        console.error('Erro ao apagar a nota:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar a nota. Tenta novamente.' });
    }
}

module.exports = { listNotes, createNote, deleteNote };
