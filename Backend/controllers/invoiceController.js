// controllers/invoiceController.js: faturas de compra pelo valor total (só Gestor e Administrador).
// Servem os eventos que não controlam o stock: regista-se o fornecedor, a data e o valor da fatura.

const invoiceModel = require('../models/invoiceModel');
const eventModel = require('../models/eventModel');

// Data no formato AAAA-MM-DD e que existe mesmo no calendário
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return false;
    }

    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// GET /api/events/:eventId/invoices
async function listInvoices(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        res.json({ invoices: await invoiceModel.findInvoicesByEvent(event.event_id) });
    } catch (error) {
        console.error('Erro ao listar as faturas:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as faturas. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/invoices: registar uma fatura pelo valor total
async function createInvoice(req, res) {
    const description = String(req.body.description || '').trim();
    const invoice = {
        supplierName: String(req.body.supplierName || '').trim(),
        invoiceDate: String(req.body.invoiceDate || ''),
        description: description === '' ? null : description,
        amount: Number(req.body.amount)
    };

    if (invoice.supplierName.length === 0 || invoice.supplierName.length > 100) {
        return res.status(400).json({ error: 'Indica o fornecedor (até 100 caracteres).' });
    }

    if (!isValidDate(invoice.invoiceDate)) {
        return res.status(400).json({ error: 'Indica a data da fatura.' });
    }

    if (invoice.description !== null && invoice.description.length > 150) {
        return res.status(400).json({ error: 'A descrição pode ter até 150 caracteres.' });
    }

    if (Number.isNaN(invoice.amount) || invoice.amount <= 0) {
        return res.status(400).json({ error: 'O valor da fatura tem de ser maior do que zero.' });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        await invoiceModel.createInvoice(event.event_id, req.session.user.userId, invoice);
        res.status(201).json({ message: 'Fatura registada.' });
    } catch (error) {
        console.error('Erro ao registar a fatura:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a fatura. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/invoices/:invoiceId
async function deleteInvoice(req, res) {
    try {
        const event = await findEvent(req);
        const invoice = event ? await invoiceModel.findInvoiceInEvent(event.event_id, Number(req.params.invoiceId)) : null;

        if (!invoice) {
            return res.status(404).json({ error: 'Esta fatura não existe.' });
        }

        await invoiceModel.deleteInvoice(invoice.invoice_id);
        res.json({ message: 'Fatura apagada.' });
    } catch (error) {
        console.error('Erro ao apagar a fatura:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar a fatura. Tenta novamente.' });
    }
}

module.exports = { listInvoices, createInvoice, deleteInvoice };
