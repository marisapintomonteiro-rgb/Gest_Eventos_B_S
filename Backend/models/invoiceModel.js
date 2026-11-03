// models/invoiceModel.js: faturas de compra pelo valor total (eventos sem controlo de stock).

const pool = require('../config/database');

async function findInvoicesByEvent(eventId) {
    const [rows] = await pool.execute(
        `SELECT invoice_id, supplier_name, invoice_date, description, amount
         FROM purchase_invoices
         WHERE event_id = ?
         ORDER BY invoice_date DESC, invoice_id DESC`,
        [eventId]
    );
    return rows;
}

// Total das faturas do evento (entra nas compras do balanço)
async function sumInvoicesByEvent(eventId) {
    const [rows] = await pool.execute(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM purchase_invoices WHERE event_id = ?',
        [eventId]
    );
    return Number(rows[0].total);
}

async function findInvoiceInEvent(eventId, invoiceId) {
    const [rows] = await pool.execute(
        'SELECT invoice_id FROM purchase_invoices WHERE event_id = ? AND invoice_id = ?',
        [eventId, invoiceId]
    );
    return rows[0] || null;
}

async function createInvoice(eventId, userId, invoice) {
    await pool.execute(
        `INSERT INTO purchase_invoices (event_id, supplier_name, invoice_date, description, amount, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, invoice.supplierName, invoice.invoiceDate, invoice.description, invoice.amount, userId]
    );
}

async function deleteInvoice(invoiceId) {
    await pool.execute('DELETE FROM purchase_invoices WHERE invoice_id = ?', [invoiceId]);
}

module.exports = { findInvoicesByEvent, sumInvoicesByEvent, findInvoiceInEvent, createInvoice, deleteInvoice };
