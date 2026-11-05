// painel.js: dashboard do evento (RF23), resultados financeiros (RF21) e despesas (RF20).
// O servidor só envia os valores financeiros ao Gestor e ao Administrador.

const pageMessage = document.getElementById('pageMessage');

let canManage = false;
let events = [];
let currentEventId = null;

startDashboardPage();

async function startDashboardPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    canManage = hasRole(page.session.role, 'Gestor');

    try {
        events = (await apiListEvents()).events;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    if (events.length === 0) {
        document.getElementById('noEventsNote').hidden = false;
        return;
    }

    currentEventId = setupEventPicker(events, 'painel.html', async (eventId) => {
        currentEventId = eventId;
        hideMessage(pageMessage);
        await renderDashboard();
    });

    if (canManage) {
        document.getElementById('expenseForm').addEventListener('submit', addExpense);
    }

    await renderDashboard();
}

async function renderDashboard() {
    let data;

    try {
        data = await apiGetDashboard(currentEventId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    document.getElementById('dashboard').hidden = false;
    renderHeroFigures(data);

    // A faturação só chega ao Gestor e ao Administrador (RF30)
    if (data.days) {
        renderDayChart(data.days);
    }

    renderTopChart(data.topItems);
    renderLowStock(data.lowStock);

    if (data.finance) {
        renderFinance(data.finance, data.revenue, eventTracksStock(data.event));
        await renderExpenses();
    }
}

// ---------- Números em destaque ----------

function renderHeroFigures(data) {
    // Evento só com valores: sem número de stock baixo
    document.getElementById('lowStockFigure').hidden = !eventTracksStock(data.event);

    if (data.days) {
        document.getElementById('revenueValue').textContent = MONEY.format(data.revenue);

        const daysWithSales = data.days.filter((day) => day.revenue > 0).length;
        document.getElementById('revenueHint').textContent = `${daysWithSales} de ${data.days.length} dias com vendas`;
    }

    const lowCount = data.lowStock.length;
    document.getElementById('lowStockValue').textContent = lowCount;
    document.getElementById('lowStockFigure').classList.toggle('is-alert', lowCount > 0);
    document.getElementById('lowStockLink').href = `stock.html?event=${currentEventId}`;

    if (data.finance) {
        const result = data.finance.result;
        const resultFigure = document.getElementById('resultFigure');
        document.getElementById('resultValue').textContent = MONEY.format(result);
        resultFigure.classList.toggle('is-profit', result >= 0);
        resultFigure.classList.toggle('is-loss', result < 0);
        document.getElementById('resultHint').textContent = result >= 0
            ? 'Lucro: a faturação já cobre as compras e as despesas'
            : `Faltam ${MONEY.format(-result)} para cobrir as compras e as despesas`;
    }
}

// ---------- Gráfico: faturação por dia (barras, com o objetivo de cada dia) ----------

function formatChartDay(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function renderDayChart(days) {
    const chart = document.getElementById('dayChart');
    chart.replaceChildren();

    // A escala vai até ao maior valor (faturação ou objetivo), para tudo caber
    const maxValue = Math.max(1, ...days.map((day) => Math.max(day.revenue, day.target || 0)));
    const hasTargets = days.some((day) => day.target !== null);
    document.getElementById('dayChartLegend').hidden = !hasTargets;

    days.forEach((day) => {
        const column = document.createElement('div');
        column.className = 'bar-column';

        const description = `${formatChartDay(day.date)}: ${MONEY.format(day.revenue)}`
            + (day.target !== null ? ` (objetivo ${MONEY.format(day.target)})` : '');
        column.title = description;
        column.tabIndex = 0;
        column.setAttribute('aria-label', description);

        const track = document.createElement('div');
        track.className = 'bar-track';

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(day.revenue / maxValue) * 100}%`;

        if (day.target !== null && day.revenue >= day.target) {
            bar.classList.add('is-on-target');
        }

        track.append(bar);

        if (day.target !== null) {
            const target = document.createElement('div');
            target.className = 'bar-target';
            target.style.bottom = `${(day.target / maxValue) * 100}%`;
            track.append(target);
        }

        column.append(
            createElementWithText('span', 'bar-value', day.revenue > 0 ? MONEY.format(day.revenue) : ''),
            track,
            createElementWithText('span', 'bar-label', formatChartDay(day.date))
        );
        chart.append(column);
    });

    // A mesma informação em tabela, para leitores de ecrã
    const table = document.getElementById('dayChartTable');
    table.replaceChildren();
    days.forEach((day) => {
        const row = document.createElement('tr');
        row.append(
            createElementWithText('th', '', formatChartDay(day.date)),
            createElementWithText('td', '', MONEY.format(day.revenue)),
            createElementWithText('td', '', day.target !== null ? MONEY.format(day.target) : '')
        );
        table.append(row);
    });
}

// ---------- Gráfico: artigos mais vendidos (barras horizontais) ----------

function renderTopChart(items) {
    const chart = document.getElementById('topChart');
    chart.replaceChildren();
    document.getElementById('topEmpty').hidden = items.length > 0;

    const maxQuantity = Math.max(1, ...items.map((item) => item.quantity));

    items.forEach((item) => {
        const line = document.createElement('li');
        line.title = item.revenue === undefined
            ? `${item.itemName}: ${item.quantity} vendidos`
            : `${item.itemName}: ${item.quantity} vendidos, ${MONEY.format(item.revenue)}`;

        const label = document.createElement('div');
        label.className = 'rank-label';
        label.append(
            createElementWithText('span', '', item.itemName),
            createElementWithText('strong', '', String(item.quantity))
        );

        const track = document.createElement('div');
        track.className = 'rank-track';
        const bar = document.createElement('div');
        bar.className = 'rank-bar';
        bar.style.width = `${(item.quantity / maxQuantity) * 100}%`;
        track.append(bar);

        line.append(label, track);
        chart.append(line);
    });
}

// ---------- Stock baixo ----------

function renderLowStock(lowStock) {
    const list = document.getElementById('lowStockList');
    list.replaceChildren();
    document.getElementById('lowStockPanel').hidden = lowStock.length === 0;

    lowStock.forEach((row) => {
        const item = document.createElement('li');
        item.className = 'is-low';
        item.append(
            createElementWithText('span', 'stock-name', row.productName),
            createElementWithText('span', 'stock-quantity', formatQuantity(row.quantity, row.unit))
        );

        const alertText = row.quantity < 0
            ? 'Negativo: falta registar compras ou corrigir'
            : `Stock baixo (mínimo ${formatQuantity(row.minStock, row.unit)})`;
        item.append(createElementWithText('span', 'stock-alert', alertText));
        list.append(item);
    });
}

// ---------- Resultados (RF21) ----------

function renderFinance(finance, revenue, trackStock = true) {
    const table = document.getElementById('financeTable');
    table.replaceChildren();

    const rows = [
        ['Faturação', revenue, ''],
        ['Compras e faturas', -finance.purchases, ''],
        ['Devoluções a fornecedores', finance.returns, ''],
        ['Despesas', -finance.expenses, ''],
        ['Resultado estimado', finance.result, 'is-total']
    ];

    rows.forEach(([label, value, className]) => appendMoneyRow(table, label, value, className));

    // O valor do stock só existe nos eventos que controlam o stock
    if (trackStock) {
        appendMoneyRow(table, 'Stock que sobra (ao custo)', finance.stockValue, 'is-separate');
        appendMoneyRow(table, 'Produtos consumidos (ao custo)', finance.consumedValue, '');
    }

    if (finance.budget !== null) {
        const left = finance.budget - finance.spent;
        appendMoneyRow(table, `Orçamento (gasto ${MONEY.format(finance.spent)})`, finance.budget, 'is-separate');
        appendMoneyRow(table, left >= 0 ? 'Ainda disponível' : 'Acima do orçamento', left, left >= 0 ? '' : 'is-negative');
    }
}

function appendMoneyRow(table, label, value, className) {
    const row = document.createElement('div');
    row.className = `money-row ${className}`.trim();
    row.append(createElementWithText('dt', '', label), createElementWithText('dd', '', MONEY.format(value)));
    table.append(row);
}

// ---------- Despesas (RF20) ----------

async function renderExpenses() {
    let result;
    let days;

    try {
        [result, days] = await Promise.all([apiListExpenses(currentEventId), apiListDays(currentEventId)]);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    // Lista dos dias para a despesa nova: do evento todo, ou de um dia
    const daySelect = document.getElementById('expenseDay');
    daySelect.replaceChildren(new Option('Evento completo', ''));
    days.days.forEach((day) => {
        daySelect.append(new Option(new Date(`${day.event_date}T12:00:00`).toLocaleDateString('pt-PT'), day.event_day_id));
    });

    const list = document.getElementById('expenseList');
    list.replaceChildren();
    const expenses = result.expenses;
    document.getElementById('expenseCount').textContent = expenses.length;
    document.getElementById('expensesEmpty').hidden = expenses.length > 0;

    expenses.forEach((expense) => {
        const item = document.createElement('li');
        const when = expense.event_date ? new Date(`${expense.event_date}T12:00:00`).toLocaleDateString('pt-PT') : 'evento completo';

        const text = document.createElement('div');
        text.append(
            createElementWithText('strong', '', expense.description),
            createElementWithText('span', 'expense-meta', `${expense.expense_type} · ${when}`)
        );

        const deleteButton = createElementWithText('button', 'link-button', 'Apagar');
        deleteButton.type = 'button';
        deleteButton.setAttribute('aria-label', `Apagar a despesa ${expense.description}`);
        deleteButton.addEventListener('click', () => deleteExpense(expense, deleteButton));

        item.append(text, createElementWithText('span', 'receipt-amount', MONEY.format(Number(expense.amount))), deleteButton);
        list.append(item);
    });
}

async function addExpense(event) {
    event.preventDefault();
    const formMessage = document.getElementById('expenseFormMessage');
    hideMessage(formMessage);

    try {
        const result = await apiCreateExpense(currentEventId, {
            description: document.getElementById('expenseDescription').value,
            amount: document.getElementById('expenseAmount').value,
            type: document.getElementById('expenseType').value,
            eventDayId: document.getElementById('expenseDay').value
        });
        document.getElementById('expenseForm').reset();
        await renderDashboard();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

async function deleteExpense(expense, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar';
        return;
    }

    try {
        const result = await apiDeleteExpense(currentEventId, expense.expense_id);
        await renderDashboard();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}
