// vendas.js: página "Vendas" (RF14, RF15 e RF30). Todos os perfis registam vendas.
// Cada venda fica no dia operacional escolhido em cima (secção 8): uma venda às 01:30
// de um evento que fecha às 02:00 continua a ser do dia anterior.

const CATEGORY_ORDER = ['Bebidas', 'Cocktails', 'Shots', 'Comida', 'Outros'];
const WEEKDAYS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const pageMessage = document.getElementById('pageMessage');
const cartMessage = document.getElementById('cartMessage');

let session = null;
let canManage = false;
let notes = [];
let lastSummary = null;
let events = [];
let days = [];
let menuItems = [];
let currentEventId = null;
let currentDay = null;

// Talão: artigos escolhidos e quantidades, por número do artigo (ex.: { 3: 2 })
let cart = {};

startSalesPage();

async function startSalesPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    session = page.session;
    canManage = hasRole(session.role, 'Gestor');

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

    currentEventId = setupEventPicker(events, 'vendas.html', loadEvent);

    document.getElementById('clearCartButton').addEventListener('click', clearCart);
    document.getElementById('dayTotalForm').addEventListener('submit', addDayTotal);
    document.getElementById('registerSalesButton').addEventListener('click', registerSales);
    setupDayClosing();

    await loadEvent(currentEventId);
}

// Ao escolher um evento: carrega os dias e a ementa e escolhe o dia mais provável
async function loadEvent(eventId) {
    currentEventId = eventId;
    hideMessage(pageMessage);
    clearCart();

    document.getElementById('closePlanner').hidden = true;

    try {
        const [dayResult, menuResult, noteResult] = await Promise.all([
            apiListDays(eventId), apiGetMenu(eventId), apiListNotes(eventId)
        ]);
        days = dayResult.days;
        menuItems = menuResult.items;
        notes = noteResult.notes;
        fillNoteTypes(noteResult.noteTypes);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    renderTillMenu();
    selectDay(chooseStartDay());
    document.getElementById('dayPicker').hidden = false;

    // Sem controlo de stock: aparece o registo da faturação em euros; a caixa só se houver ementa
    const tracking = isTrackingStock();
    document.getElementById('dayTotalPanel').hidden = tracking;
    document.getElementById('till').hidden = !tracking && menuItems.length === 0;
}

// O evento escolhido controla o stock?
function isTrackingStock() {
    return eventTracksStock(events.find((item) => item.event_id === currentEventId));
}

// ---------- Dia operacional ----------

// Começa no dia de hoje, se for um dia do evento; senão, no primeiro dia ainda aberto
function chooseStartDay() {
    const today = new Date().toLocaleDateString('sv-SE');
    return days.find((day) => day.event_date === today)
        || days.find((day) => !day.is_closed)
        || days[0];
}

function formatDay(day) {
    const date = new Date(`${day.event_date}T12:00:00`);
    return `${WEEKDAYS[date.getDay()]} ${date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`;
}

function renderDayButtons() {
    const container = document.getElementById('dayButtons');
    container.replaceChildren();

    days.forEach((day) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'day-button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(day === currentDay));
        button.append(createElementWithText('span', '', formatDay(day)));

        if (day.is_closed) {
            button.classList.add('is-closed');
            button.append(createElementWithText('small', '', 'fechado'));
        }

        button.addEventListener('click', () => selectDay(day));
        container.appendChild(button);
    });
}

async function selectDay(day) {
    currentDay = day;
    renderDayButtons();

    // Diz claramente em que dia ficam as vendas, com o horário (pode passar da meia-noite)
    const note = document.getElementById('dayNote');
    let text = `As vendas ficam registadas em ${formatDay(day)}`;

    if (day.start_time && day.end_time) {
        const start = day.start_time.slice(0, 5);
        const end = day.end_time.slice(0, 5);
        text += `, das ${start} às ${end}`;

        if (end < start) {
            text += ` (as vendas depois da meia-noite continuam neste dia)`;
        }
    }

    note.textContent = `${text}.`;
    note.classList.toggle('is-closed', Boolean(day.is_closed));

    if (day.is_closed) {
        note.textContent = 'Este dia está fechado: não aceita novas vendas. O Gestor pode reabri-lo.';
    }

    document.getElementById('closeDayButton').hidden = Boolean(day.is_closed);
    const reopenButton = document.getElementById('reopenDayButton');
    reopenButton.hidden = !day.is_closed;
    reopenButton.classList.remove('is-confirming');
    reopenButton.textContent = 'Reabrir dia';
    document.getElementById('closePlanner').hidden = true;
    renderNotes();

    updateCart();
    await renderDaySales();
}

// ---------- Ementa e talão ----------

function renderTillMenu() {
    const container = document.getElementById('tillCategories');
    container.replaceChildren();
    document.getElementById('tillMenuEmpty').hidden = menuItems.length > 0;

    CATEGORY_ORDER.forEach((category) => {
        const items = menuItems.filter((item) => item.category === category);

        if (items.length === 0) {
            return;
        }

        const section = document.createElement('section');
        section.className = 'till-category';
        section.append(createElementWithText('h3', 'menu-category-title', category));

        const grid = document.createElement('div');
        grid.className = 'till-grid';

        items.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'till-item';
            button.dataset.itemId = item.menu_item_id;
            button.append(
                createElementWithText('span', 'till-item-name', item.item_name),
                createElementWithText('span', 'till-item-price', MONEY.format(Number(item.price))),
                createElementWithText('span', 'till-item-count', '')
            );
            button.addEventListener('click', () => addToCart(item.menu_item_id, 1));
            grid.appendChild(button);
        });

        section.append(grid);
        container.append(section);
    });
}

function findItem(itemId) {
    return menuItems.find((item) => item.menu_item_id === Number(itemId));
}

function addToCart(itemId, amount) {
    hideMessage(cartMessage);
    cart[itemId] = (cart[itemId] || 0) + amount;

    if (cart[itemId] <= 0) {
        delete cart[itemId];
    }

    updateCart();
}

function clearCart() {
    cart = {};
    hideMessage(cartMessage);
    updateCart();
}

// Desenha o talão e o total; mostra nos botões da ementa quantos estão no talão
function updateCart() {
    const list = document.getElementById('cartLines');
    list.replaceChildren();
    let total = 0;

    Object.keys(cart).forEach((itemId) => {
        const item = findItem(itemId);
        const quantity = cart[itemId];
        const lineTotal = quantity * Number(item.price);
        total += lineTotal;

        const line = document.createElement('li');
        line.className = 'cart-line';

        const minus = createElementWithText('button', 'qty-button', '−');
        minus.type = 'button';
        minus.setAttribute('aria-label', `Menos um ${item.item_name}`);
        minus.addEventListener('click', () => addToCart(itemId, -1));

        // A quantidade pode ser escrita (ex.: 1000 cervejas de uma vez)
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.step = '1';
        quantityInput.inputMode = 'numeric';
        quantityInput.className = 'qty-input';
        quantityInput.value = quantity;
        quantityInput.setAttribute('aria-label', `Quantidade de ${item.item_name}`);
        quantityInput.addEventListener('change', () => {
            const value = Math.floor(Number(quantityInput.value));
            cart[itemId] = value > 0 ? value : 1;
            updateCart();
        });

        const plus = createElementWithText('button', 'qty-button', '+');
        plus.type = 'button';
        plus.setAttribute('aria-label', `Mais um ${item.item_name}`);
        plus.addEventListener('click', () => addToCart(itemId, 1));

        const quantityBox = document.createElement('span');
        quantityBox.className = 'qty-box';
        quantityBox.append(minus, quantityInput, plus);

        line.append(
            createElementWithText('span', 'cart-name', item.item_name),
            quantityBox,
            createElementWithText('span', 'cart-amount', MONEY.format(lineTotal))
        );
        list.append(line);
    });

    const isEmpty = Object.keys(cart).length === 0;
    const isClosed = Boolean(currentDay && currentDay.is_closed);
    document.getElementById('cartEmpty').hidden = !isEmpty;
    document.getElementById('cartTotal').textContent = MONEY.format(total);
    document.getElementById('registerSalesButton').disabled = isEmpty || isClosed;
    document.getElementById('till').classList.toggle('is-locked', isClosed);

    document.querySelectorAll('.till-item').forEach((button) => {
        const count = cart[button.dataset.itemId];
        button.querySelector('.till-item-count').textContent = count ? `× ${count}` : '';
        button.classList.toggle('is-in-cart', Boolean(count));
        button.disabled = isClosed;
    });
}

async function registerSales() {
    hideMessage(cartMessage);
    const button = document.getElementById('registerSalesButton');
    button.disabled = true;

    const lines = Object.keys(cart).map((itemId) => ({ menuItemId: Number(itemId), quantity: cart[itemId] }));

    try {
        const result = await apiCreateSales(currentEventId, currentDay.event_day_id, lines);
        clearCart();
        showSaleResult(result);
        await renderDaySales();
    } catch (error) {
        showMessage(cartMessage, error.message, 'is-error');
        updateCart();
    }
}

// A venda fica sempre registada; se algum produto ficou com stock negativo, aparece o aviso
function showSaleResult(result) {
    if (result.warnings.length === 0) {
        showMessage(pageMessage, result.message, 'is-success');
        return;
    }

    const products = result.warnings
        .map((warning) => `${warning.productName} (${formatQuantity(warning.quantity, warning.unit)})`)
        .join(', ');
    showMessage(pageMessage, `${result.message} Atenção: o stock ficou negativo em ${products}. Avisa o Gestor para registar a compra ou corrigir o stock.`, 'is-info');
}

// ---------- Vendas do dia (RF30) ----------

async function renderDaySales() {
    let result;

    try {
        result = await apiListSales(currentEventId, currentDay.event_day_id);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    lastSummary = result.summary;
    document.getElementById('daySales').hidden = false;
    document.getElementById('daySalesTitle').textContent = `Vendas de ${formatDay(currentDay)}`;
    document.getElementById('dayRevenue').textContent = MONEY.format(result.summary.revenue);

    const top = result.summary.items[0];
    document.getElementById('dayTopItem').textContent = top ? `${top.itemName} (${top.quantity})` : '—';

    const summary = document.getElementById('itemSummary');
    summary.replaceChildren();

    result.summary.items.forEach((item) => {
        const line = document.createElement('li');
        line.append(
            createElementWithText('span', '', `${item.quantity} × ${item.itemName}`),
            createElementWithText('span', 'receipt-amount', MONEY.format(item.revenue))
        );
        summary.append(line);
    });

    renderSalesLog(result.sales);
    renderDayTotals(result.dayTotals || []);
}

// Lista dos registos, com o botão Anular (o Colaborador só vê nas suas; o servidor confirma)
function renderSalesLog(sales) {
    const log = document.getElementById('salesLog');
    log.replaceChildren();
    document.getElementById('salesEmpty').hidden = sales.length > 0;

    const canCancelAll = hasRole(session.role, 'Gestor');

    sales.forEach((sale) => {
        const line = document.createElement('li');
        line.className = 'sales-log-line';

        if (sale.cancelled_at) {
            line.classList.add('is-cancelled');
        }

        const time = sale.created_at.slice(11, 16);
        line.append(
            createElementWithText('span', 'sale-time', time),
            createElementWithText('span', 'sale-what', `${sale.quantity} × ${sale.item_name}`),
            createElementWithText('span', 'sale-who', sale.created_by_email),
            createElementWithText('span', 'receipt-amount', MONEY.format(sale.quantity * Number(sale.unit_price)))
        );

        if (sale.cancelled_at) {
            line.append(createElementWithText('span', 'tag', 'Anulada'));
        } else if (!currentDay.is_closed && (canCancelAll || sale.created_by === session.userId)) {
            const cancelButton = createElementWithText('button', 'link-button', 'Anular');
            cancelButton.type = 'button';
            cancelButton.setAttribute('aria-label', `Anular ${sale.quantity} × ${sale.item_name}`);
            cancelButton.addEventListener('click', () => cancelSale(sale, cancelButton));
            line.append(cancelButton);
        }

        log.append(line);
    });
}

// Anular pede uma segunda confirmação no próprio botão
async function cancelSale(sale, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar';
        return;
    }

    try {
        const result = await apiCancelSale(currentEventId, sale.sale_id);
        showMessage(pageMessage, result.message, 'is-success');
        await renderDaySales();
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// ---------- Fecho do dia (RF19) e notas (RF24) ----------

function setupDayClosing() {
    if (!canManage) {
        return;
    }

    document.getElementById('closeDayButton').addEventListener('click', openClosePlanner);
    document.getElementById('cancelCloseButton').addEventListener('click', () => {
        document.getElementById('closePlanner').hidden = true;
    });
    document.getElementById('closeForm').addEventListener('submit', closeDay);
    document.getElementById('reopenDayButton').addEventListener('click', reopenDay);
    document.getElementById('noteForm').addEventListener('submit', addNote);
}

function fillNoteTypes(noteTypes) {
    document.querySelectorAll('.note-type-select').forEach((select) => {
        select.replaceChildren();
        noteTypes.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            select.appendChild(option);
        });
    });
}

// Antes de fechar, mostra a faturação, o artigo mais vendido e o objetivo do dia
function openClosePlanner() {
    hideMessage(pageMessage);
    hideMessage(document.getElementById('closeFormMessage'));
    document.getElementById('closeForm').reset();

    const figures = document.getElementById('closeFigures');
    figures.replaceChildren();
    const top = lastSummary.items[0];

    figures.append(createFigure('Faturação do dia', MONEY.format(lastSummary.revenue)));
    figures.append(createFigure('Mais vendido', top ? `${top.itemName} (${top.quantity})` : '—', true));

    if (currentDay.revenue_target !== null) {
        const target = Number(currentDay.revenue_target);
        const percent = target > 0 ? Math.round((lastSummary.revenue / target) * 100) : 0;
        figures.append(createFigure('Objetivo do dia', `${MONEY.format(target)} (${percent}%)`, true));
    }

    const planner = document.getElementById('closePlanner');
    planner.hidden = false;
    planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createFigure(label, value, isText = false) {
    const figure = document.createElement('div');
    figure.className = 'figure';
    figure.append(
        createElementWithText('span', 'figure-label', label),
        createElementWithText('strong', isText ? 'figure-value figure-text' : 'figure-value', value)
    );
    return figure;
}

async function closeDay(event) {
    event.preventDefault();
    const formMessage = document.getElementById('closeFormMessage');
    hideMessage(formMessage);
    const noteText = document.getElementById('closeNoteText').value.trim();

    try {
        if (noteText !== '') {
            await apiCreateNote(currentEventId, {
                eventDayId: currentDay.event_day_id,
                noteType: document.getElementById('closeNoteType').value,
                noteText
            });
        }

        const result = await apiCloseDay(currentEventId, currentDay.event_day_id);
        await reloadDays();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

// Reabrir pede uma segunda confirmação no próprio botão
async function reopenDay() {
    const button = document.getElementById('reopenDayButton');

    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar reabrir';
        return;
    }

    try {
        const result = await apiReopenDay(currentEventId, currentDay.event_day_id);
        await reloadDays();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// Volta a ler os dias e as notas e fica no mesmo dia
async function reloadDays() {
    const dayId = currentDay.event_day_id;
    const [dayResult, noteResult] = await Promise.all([apiListDays(currentEventId), apiListNotes(currentEventId)]);
    days = dayResult.days;
    notes = noteResult.notes;
    await selectDay(days.find((day) => day.event_day_id === dayId));
}

function renderNotes() {
    const list = document.getElementById('noteList');
    list.replaceChildren();
    const dayNotes = notes.filter((note) => note.event_day_id === currentDay.event_day_id);
    document.getElementById('notesEmpty').hidden = dayNotes.length > 0;

    dayNotes.forEach((note) => {
        const item = document.createElement('li');
        item.append(
            createElementWithText('span', 'tag', note.note_type),
            createElementWithText('span', 'note-text', note.note_text)
        );

        if (canManage) {
            const deleteButton = createElementWithText('button', 'link-button', 'Apagar');
            deleteButton.type = 'button';
            deleteButton.setAttribute('aria-label', `Apagar a nota: ${note.note_text}`);
            deleteButton.addEventListener('click', () => deleteNote(note, deleteButton));
            item.append(deleteButton);
        }

        list.append(item);
    });
}

async function addNote(event) {
    event.preventDefault();
    const textInput = document.getElementById('noteText');

    if (textInput.value.trim() === '') {
        textInput.focus();
        return;
    }

    try {
        const result = await apiCreateNote(currentEventId, {
            eventDayId: currentDay.event_day_id,
            noteType: document.getElementById('noteType').value,
            noteText: textInput.value
        });
        textInput.value = '';
        notes = (await apiListNotes(currentEventId)).notes;
        renderNotes();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

async function deleteNote(note, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar';
        return;
    }

    try {
        await apiDeleteNote(currentEventId, note.note_id);
        notes = (await apiListNotes(currentEventId)).notes;
        renderNotes();
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// ---------- Faturação do dia em euros (eventos sem controlo de stock) ----------

async function addDayTotal(event) {
    event.preventDefault();
    const message = document.getElementById('dayTotalMessage');
    hideMessage(message);
    const amountInput = document.getElementById('dayTotalAmount');

    if (!(Number(amountInput.value) > 0)) {
        showMessage(message, 'Indica o valor faturado.', 'is-error');
        amountInput.focus();
        return;
    }

    try {
        const result = await apiCreateDayTotal(currentEventId, currentDay.event_day_id, amountInput.value, document.getElementById('dayTotalNote').value);
        document.getElementById('dayTotalForm').reset();
        await renderDaySales();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(message, error.message, 'is-error');
    }
}

// Os totais em euros aparecem no topo dos registos do dia
function renderDayTotals(dayTotals) {
    const log = document.getElementById('salesLog');
    const canDeleteAll = hasRole(session.role, 'Gestor');

    if (dayTotals.length > 0) {
        document.getElementById('salesEmpty').hidden = true;
    }

    [...dayTotals].reverse().forEach((total) => {
        const line = document.createElement('li');
        line.className = 'sales-log-line';
        line.append(
            createElementWithText('span', 'sale-time', total.created_at.slice(11, 16)),
            createElementWithText('span', 'sale-what', total.note ? `Total em euros · ${total.note}` : 'Total em euros'),
            createElementWithText('span', 'sale-who', total.created_by_email),
            createElementWithText('span', 'receipt-amount', MONEY.format(Number(total.amount)))
        );

        if (!currentDay.is_closed && (canDeleteAll || total.created_by === session.userId)) {
            const deleteButton = createElementWithText('button', 'link-button', 'Apagar');
            deleteButton.type = 'button';
            deleteButton.setAttribute('aria-label', `Apagar o total de ${MONEY.format(Number(total.amount))}`);
            deleteButton.addEventListener('click', () => deleteDayTotal(total, deleteButton));
            line.append(deleteButton);
        }

        log.prepend(line);
    });
}

async function deleteDayTotal(total, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar';
        return;
    }

    try {
        const result = await apiDeleteDayTotal(currentEventId, total.revenue_id);
        await renderDaySales();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}
