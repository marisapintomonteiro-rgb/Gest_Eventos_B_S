// models/noteModel.js: lê e grava as notas de cada evento (RF24).

const pool = require('../config/database');

// Notas do evento (diárias e finais), da mais recente para a mais antiga
async function findNotesByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT n.note_id, n.event_day_id, n.note_type, n.note_text, n.created_at, d.event_date,
                u.email AS created_by_email
         FROM event_notes n
         JOIN users u ON u.user_id = n.created_by
         LEFT JOIN event_days d ON d.event_day_id = n.event_day_id
         WHERE n.event_id = ?
         ORDER BY n.created_at DESC, n.note_id DESC`,
        [eventId]
    );
    return rows;
}

// Confirma que a nota pertence a este evento
async function findNoteInEvent(eventId, noteId) {
    const [rows] = await pool.execute(
        'SELECT note_id FROM event_notes WHERE event_id = ? AND note_id = ?',
        [eventId, noteId]
    );
    return rows[0] || null;
}

// Grava uma nota. Sem dia (dayId null), é uma nota final do evento.
async function createNote(eventId, dayId, userId, noteType, noteText) {
    const [result] = await pool.execute(
        'INSERT INTO event_notes (event_id, event_day_id, note_type, note_text, created_by) VALUES (?, ?, ?, ?, ?)',
        [eventId, dayId, noteType, noteText, userId]
    );
    return result.insertId;
}

async function deleteNote(noteId) {
    await pool.execute('DELETE FROM event_notes WHERE note_id = ?', [noteId]);
}

module.exports = { findNotesByEvent, findNoteInEvent, createNote, deleteNote };
