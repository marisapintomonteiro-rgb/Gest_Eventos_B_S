// relatorio.js: encerramento do evento (RF25), prazo de edição (RF26), notas finais (RF24)
// e relatório final (RF27). Só Gestor e Administrador.
// O PDF é feito pelo próprio browser: "Guardar PDF" abre a janela de impressão, onde se escolhe
// "Guardar como PDF". As regras @media print do style.css deixam só o relatório na folha.

const pageMessage = document.getElementById('pageMessage');

let session = null;
let brand = null;
let events = [];
let currentEventId = null;
let report = null;

startReportPage();

async function startReportPage() {
    const page = await startPrivatePage('Gestor');

    if (!page) {
        return;
    }

    session = page.session;
    brand = page.brand;

    try {
        events = (await apiListEvents()).events;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    if (events.length === 0) {
        document.getElementById('noEventsNote').hidden = false;
        document.querySelector('.heading-actions').hidden = true;
        return;
    }

    currentEventId = setupEventPicker(events, 'relatorio.html', async (eventId) => {
        currentEventId = eventId;
        hideMessage(pageMessage);
        await loadReport();
    });

    document.getElementById('printButton').addEventListener('click', () => window.print());
    document.getElementById('closeEventButton').addEventListener('click', closeEvent);
    document.getElementById('finalNoteForm').addEventListener('submit', addFinalNote);

    await loadReport();
}

async function loadReport() {
    try {
        const [reportResult, noteResult] = await Promise.all([apiGetReport(currentEventId), apiListNotes(currentEventId)]);
        report = reportResult;
        fillNoteTypes(noteResult.noteTypes);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    renderStatus();
    renderReport();
}

function formatDate(text) {
    return text ? new Date(`${text}T12:00:00`).toLocaleDateString('pt-PT') : '—';
}

// ---------- Estado e encerramento ----------

function renderStatus() {
    const event = report.event;
    const closedDays = report.days.filter((day) => day.isClosed).length;
    const allClosed = closedDays === report.days.length;

    document.getElementById('statusPanel').hidden = false;
    document.getElementById('daysClosedText').textContent = `${closedDays} de ${report.days.length}`;
    document.getElementById('deadlineText').textContent = formatDate(event.edit_deadline);

    let status = 'A decorrer';
    let hint = 'Para encerrar, fecha primeiro todos os dias na página Vendas. A contagem física final é opcional: faz-se com "Corrigir stock".';

    if (event.is_closed) {
        status = `Encerrado a ${new Date(event.closed_at.replace(' ', 'T')).toLocaleDateString('pt-PT')}`;
        hint = 'Depois do encerramento ainda se podem fazer correções de stock e devoluções, até ao fim do prazo. O relatório pode ser gerado de novo.';
    } else if (allClosed) {
        hint = 'Todos os dias estão fechados: o evento pode ser encerrado.';
    }

    if (!event.is_editable) {
        status = event.is_closed ? `${status} · só consulta` : 'Só consulta';
        hint = 'O prazo de edição terminou (um mês depois do último dia). O evento fica só para consulta; o histórico continua disponível.';
    }

    document.getElementById('statusText').textContent = status;
    document.getElementById('statusHint').textContent = hint;

    const closeButton = document.getElementById('closeEventButton');
    closeButton.hidden = Boolean(event.is_closed) || !event.is_editable;
    closeButton.disabled = !allClosed;
    closeButton.title = allClosed ? '' : 'Fecha primeiro todos os dias';
    closeButton.classList.remove('is-confirming');
    closeButton.textContent = 'Encerrar evento';

    document.getElementById('finalNoteForm').hidden = !event.is_editable;
}

// Encerrar pede uma segunda confirmação no próprio botão
async function closeEvent() {
    const button = document.getElementById('closeEventButton');

    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar encerramento';
        return;
    }

    try {
        const result = await apiCloseEvent(currentEventId);
        await loadReport();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// ---------- Notas finais ----------

function fillNoteTypes(noteTypes) {
    const select = document.getElementById('finalNoteType');
    select.replaceChildren(...noteTypes.map((type) => new Option(type, type)));
}

async function addFinalNote(event) {
    event.preventDefault();
    const textInput = document.getElementById('finalNoteText');

    if (textInput.value.trim() === '') {
        textInput.focus();
        return;
    }

    try {
        // Sem dia: é uma nota final do evento
        const result = await apiCreateNote(currentEventId, {
            noteType: document.getElementById('finalNoteType').value,
            noteText: textInput.value
        });
        textInput.value = '';
        await loadReport();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// ---------- O relatório ----------

function renderReport() {
    const event = report.event;
    document.getElementById('report').hidden = false;
    document.getElementById('reportBrand').textContent = `${brand.name} · Relatório final do evento`;
    document.getElementById('reportTitle').textContent = event.event_name;
    document.getElementById('reportMeta').textContent = `${event.location} · ${formatDate(event.first_day)} a ${formatDate(event.last_day)} · ${report.days.length} dias`;

    renderFinance();
    fillTable('reportDays', report.days, (day) => [
        formatDate(day.date),
        day.target !== null ? MONEY.format(day.target) : '—',
        MONEY.format(day.revenue)
    ], 'Sem dias.', ['Total', '', MONEY.format(report.revenue)]);

    fillTable('reportItems', report.items, (item) => [
        item.itemName, String(item.quantity), MONEY.format(item.revenue)
    ], 'Ainda não há vendas.');

    fillTable('reportExpenses', report.expenses, (expense) => [
        expense.event_date ? `${expense.description} (${formatDate(expense.event_date)})` : expense.description,
        expense.expense_type,
        MONEY.format(Number(expense.amount))
    ], 'Sem despesas.', ['Total', '', MONEY.format(report.finance.expenses)]);

    fillTable('reportReturns', report.returns, (item) => [
        `${QUANTITY.format(Number(item.packages))} × ${item.product_name}`,
        item.supplier_name,
        MONEY.format(Number(item.packages) * Number(item.package_price))
    ], 'Sem devoluções.');

    fillTable('reportInvoices', report.invoices || [], (invoice) => [
        `${invoice.supplier_name}${invoice.description ? ` (${invoice.description})` : ''}`,
        formatDate(invoice.invoice_date),
        MONEY.format(Number(invoice.amount))
    ], 'Sem faturas.');
    document.getElementById('reportInvoicesSection').hidden = (report.invoices || []).length === 0;
    document.getElementById('reportStockSection').hidden = !trackStock();

    fillTable('reportStock', report.stock, (row) => [
        row.product_name,
        formatQuantity(row.purchased, row.unit),
        formatQuantity(row.quantity, row.unit)
    ], 'Sem stock.');

    renderNotes();

    const now = new Date();
    document.getElementById('reportFoot').textContent = `Gerado a ${now.toLocaleDateString('pt-PT')} às ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} por ${session.email}.`;
}

function renderFinance() {
    const finance = report.finance;
    const table = document.getElementById('reportFinance');
    table.replaceChildren();

    const rows = [
        ['Faturação', report.revenue, ''],
        ['Compras e faturas', -finance.purchases, ''],
        ['Devoluções a fornecedores', finance.returns, ''],
        ['Despesas', -finance.expenses, ''],
        ['Resultado', finance.result, 'is-total']
    ];

    // O valor do stock só existe nos eventos que controlam o stock
    if (trackStock()) {
        rows.push(['Stock que sobrou (ao custo)', finance.stockValue, 'is-separate']);
        rows.push(['Produtos consumidos (ao custo)', finance.consumedValue, '']);
    }

    if (finance.budget !== null) {
        rows.push([`Orçamento (gasto ${MONEY.format(finance.spent)})`, finance.budget, 'is-separate']);
    }

    rows.forEach(([label, value, className]) => {
        const row = document.createElement('div');
        row.className = `money-row ${className}`.trim();
        row.append(createElementWithText('dt', '', label), createElementWithText('dd', '', MONEY.format(value)));
        table.append(row);
    });
}

// Preenche uma tabela do relatório; sem linhas, mostra a mensagem. A linha de total é opcional.
function fillTable(bodyId, rows, toCells, emptyText, totalCells = null) {
    const body = document.getElementById(bodyId);
    body.replaceChildren();

    if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = createElementWithText('td', 'report-empty', emptyText);
        td.colSpan = 3;
        tr.append(td);
        body.append(tr);
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement('tr');
        toCells(row).forEach((text) => tr.append(createElementWithText('td', '', text)));
        body.append(tr);
    });

    if (totalCells) {
        const tr = document.createElement('tr');
        tr.className = 'report-total';
        totalCells.forEach((text) => tr.append(createElementWithText('td', '', text)));
        body.append(tr);
    }
}

// Notas diárias (por dia) e finais, do mais antigo para o mais recente
function renderNotes() {
    const list = document.getElementById('reportNotes');
    list.replaceChildren();
    const notes = [...report.notes].reverse();

    if (notes.length === 0) {
        list.append(createElementWithText('li', 'report-empty', 'Sem notas.'));
        return;
    }

    notes.forEach((note) => {
        const item = document.createElement('li');
        const when = note.event_date ? formatDate(note.event_date) : 'Nota final';
        item.append(
            createElementWithText('strong', '', `${when} · ${note.note_type}: `),
            document.createTextNode(note.note_text)
        );
        list.append(item);
    });
}

// O evento do relatório controla o stock?
function trackStock() {
    return eventTracksStock(report.event);
}
