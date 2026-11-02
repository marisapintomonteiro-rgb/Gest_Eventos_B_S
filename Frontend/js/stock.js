// stock.js: página "Stock" (RF15, RF16, RF17 e RF18).
// Todos os perfis veem as quantidades e registam consumo interno;
// o Gestor e o Administrador registam ofertas, quebras e desperdícios e corrigem o stock.

const TYPE_HINTS = {
    'Consumo interno': 'Produto usado pela equipa (ex.: águas para o staff).',
    Oferta: 'Produto oferecido a clientes ou convidados.',
    Quebra: 'Produto partido ou estragado por acidente.',
    Desperdício: 'Produto que se perdeu (ex.: fruta que se estragou, barril que não se aproveitou).'
};

const pageMessage = document.getElementById('pageMessage');
const outPlanner = document.getElementById('outPlanner');
const correctionPlanner = document.getElementById('correctionPlanner');
const outForm = document.getElementById('outForm');
const correctionForm = document.getElementById('correctionForm');

let canManage = false;
let events = [];
let days = [];
let stock = [];
let brandProducts = [];
let currentEventId = null;

startStockPage();

async function startStockPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    canManage = hasRole(page.session.role, 'Gestor');

    try {
        events = (await apiListEvents()).events;

        // O Gestor pode corrigir qualquer produto da marca (ex.: um produto encontrado que não foi comprado)
        if (canManage) {
            brandProducts = (await apiListProducts()).products;
        }
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    if (events.length === 0) {
        document.getElementById('noEventsNote').hidden = false;
        document.querySelector('.heading-actions').hidden = true;
        return;
    }

    currentEventId = setupEventPicker(events, 'stock.html', async (eventId) => {
        currentEventId = eventId;
        closePlanners();
        hideMessage(pageMessage);
        await loadEvent();
    });

    setupForms();
    await loadEvent();
}

async function loadEvent() {
    try {
        days = (await apiListDays(currentEventId)).days;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    await renderStock();
}

// ---------- Formulários ----------

function setupForms() {
    document.getElementById('outButton').addEventListener('click', openOutForm);
    document.getElementById('correctionButton').addEventListener('click', openCorrectionForm);
    document.querySelectorAll('[data-close-planner]').forEach((button) => button.addEventListener('click', closePlanners));

    outForm.querySelectorAll('input[name="outType"]').forEach((input) => input.addEventListener('change', updateOutHint));
    document.getElementById('outProduct').addEventListener('change', () => updateUnit('outProduct', 'outUnit'));
    document.getElementById('correctionProduct').addEventListener('change', updateCorrectionInfo);

    clearErrorsWhileTyping(outForm);
    clearErrorsWhileTyping(correctionForm);
    outForm.addEventListener('submit', saveOut);
    correctionForm.addEventListener('submit', saveCorrection);
}

function closePlanners() {
    outPlanner.hidden = true;
    correctionPlanner.hidden = true;
}

function showPlanner(planner) {
    planner.hidden = false;
    planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Lista de produtos: os que têm stock no evento (para o Gestor nas correções, todos os da marca)
function fillProductSelect(select, products) {
    select.replaceChildren();

    products.forEach((product) => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.product_name;
        option.dataset.unit = product.unit;
        select.appendChild(option);
    });
}

function updateUnit(selectId, unitId) {
    const option = document.getElementById(selectId).selectedOptions[0];
    document.getElementById(unitId).textContent = option ? UNIT_LABELS[option.dataset.unit] : '';
}

function updateOutHint() {
    const type = outForm.querySelector('input[name="outType"]:checked').value;
    document.getElementById('outTypeHint').textContent = TYPE_HINTS[type];
}

function openOutForm() {
    closePlanners();
    hideMessage(pageMessage);

    if (stock.length === 0) {
        showMessage(pageMessage, 'Ainda não há stock neste evento: regista primeiro as compras.', 'is-info');
        return;
    }

    outForm.reset();
    clearFormErrors(outForm);
    hideMessage(document.getElementById('outFormMessage'));

    // Só os dias abertos aceitam registos; começa no dia de hoje, se for dia do evento
    const daySelect = document.getElementById('outDay');
    daySelect.replaceChildren();
    const openDays = days.filter((day) => !day.is_closed);

    openDays.forEach((day) => {
        const option = document.createElement('option');
        option.value = day.event_day_id;
        option.textContent = new Date(`${day.event_date}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' });
        daySelect.appendChild(option);
    });

    if (openDays.length === 0) {
        showMessage(pageMessage, 'Todos os dias deste evento estão fechados. O Gestor pode reabrir um dia.', 'is-info');
        return;
    }

    const today = new Date().toLocaleDateString('sv-SE');
    const todayDay = openDays.find((day) => day.event_date === today);

    if (todayDay) {
        daySelect.value = todayDay.event_day_id;
    }

    fillProductSelect(document.getElementById('outProduct'), stock);
    updateUnit('outProduct', 'outUnit');
    updateOutHint();
    showPlanner(outPlanner);
}

function openCorrectionForm() {
    closePlanners();
    hideMessage(pageMessage);
    correctionForm.reset();
    clearFormErrors(correctionForm);
    hideMessage(document.getElementById('correctionFormMessage'));

    fillProductSelect(document.getElementById('correctionProduct'), brandProducts);
    updateCorrectionInfo();
    showPlanner(correctionPlanner);
}

// Mostra quanto o sistema tem agora, para comparar com a contagem
function updateCorrectionInfo() {
    updateUnit('correctionProduct', 'correctionUnit');
    const select = document.getElementById('correctionProduct');
    const option = select.selectedOptions[0];

    if (!option) {
        return;
    }

    const row = stock.find((item) => String(item.product_id) === select.value);
    const current = row ? Number(row.quantity) : 0;
    document.getElementById('correctionCurrent').textContent = `O sistema tem agora ${formatQuantity(current, option.dataset.unit)}. Escreve a quantidade que contaste: a diferença fica registada.`;
}

async function saveOut(event) {
    event.preventDefault();
    clearFormErrors(outForm);
    const formMessage = document.getElementById('outFormMessage');
    hideMessage(formMessage);

    const quantityInput = document.getElementById('outQuantity');

    if (!(Number(quantityInput.value) > 0)) {
        showFieldError(quantityInput, 'Indica a quantidade que saiu.');
        return;
    }

    try {
        const result = await apiCreateStockMovement(currentEventId, {
            type: outForm.querySelector('input[name="outType"]:checked').value,
            eventDayId: document.getElementById('outDay').value,
            productId: document.getElementById('outProduct').value,
            quantity: quantityInput.value,
            reason: document.getElementById('outReason').value
        });
        closePlanners();
        await renderStock();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

async function saveCorrection(event) {
    event.preventDefault();
    clearFormErrors(correctionForm);
    const formMessage = document.getElementById('correctionFormMessage');
    hideMessage(formMessage);

    const quantityInput = document.getElementById('correctionQuantity');
    const reasonInput = document.getElementById('correctionReason');

    if (quantityInput.value === '' || Number(quantityInput.value) < 0) {
        showFieldError(quantityInput, 'Indica a quantidade contada.');
        return;
    }

    if (reasonInput.value.trim() === '') {
        showFieldError(reasonInput, 'Indica o motivo da correção.');
        return;
    }

    try {
        const result = await apiCreateStockCorrection(currentEventId, {
            productId: document.getElementById('correctionProduct').value,
            newQuantity: quantityInput.value,
            reason: reasonInput.value
        });
        closePlanners();
        await renderStock();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- Stock e movimentos ----------

async function renderStock() {
    let result;

    try {
        result = await apiGetStock(currentEventId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    stock = result.stock;
    document.getElementById('stockLayout').hidden = false;
    renderStockTable();
    renderMovements(result.movements);
}

// Stock baixo: igual ou abaixo do mínimo do produto (RF18). Negativo: faltam registos.
function renderStockTable() {
    const body = document.getElementById('stockRows');
    body.replaceChildren();
    document.getElementById('stockEmpty').hidden = stock.length > 0;
    let lowCount = 0;

    stock.forEach((row) => {
        const quantity = Number(row.quantity);
        const tr = document.createElement('tr');

        const nameCell = document.createElement('th');
        nameCell.scope = 'row';
        nameCell.textContent = row.product_name;

        if (row.is_residual) {
            nameCell.append(' ', createElementWithText('span', 'tag', 'residual'));
        }

        const stockCell = createElementWithText('td', 'stock-now', formatQuantity(quantity, row.unit));

        if (quantity < 0) {
            tr.className = 'is-negative';
            stockCell.append(createElementWithText('small', 'stock-alert', 'Negativo: falta registar compras ou corrigir'));
            lowCount += 1;
        } else if (row.min_stock !== null && quantity <= Number(row.min_stock)) {
            tr.className = 'is-low';
            stockCell.append(createElementWithText('small', 'stock-alert', `Stock baixo (mínimo ${formatQuantity(row.min_stock, row.unit)})`));
            lowCount += 1;
        }

        tr.append(
            nameCell,
            createElementWithText('td', '', formatQuantity(row.purchased, row.unit)),
            createElementWithText('td', '', formatMoved(Number(row.moved), row.unit)),
            stockCell
        );
        body.append(tr);
    });

    const lowBadge = document.getElementById('lowCount');
    lowBadge.hidden = lowCount === 0;
    lowBadge.textContent = lowCount;
    lowBadge.title = `${lowCount} produto(s) com stock baixo`;
}

// Saldo das vendas, consumos, perdas e acertos: "−44 L" (saiu) ou "+500 g" (entrou com uma correção)
function formatMoved(moved, unit) {
    if (moved === 0) {
        return '—';
    }

    return `${moved < 0 ? '−' : '+'}${formatQuantity(Math.abs(moved), unit)}`;
}

function renderMovements(movements) {
    const list = document.getElementById('movementList');
    list.replaceChildren();
    document.getElementById('movementsEmpty').hidden = movements.length > 0;

    movements.forEach((movement) => {
        const item = document.createElement('li');
        const quantity = Number(movement.quantity);
        const sign = quantity > 0 ? '+' : '−';

        const top = document.createElement('div');
        top.className = 'movement-top';
        top.append(
            createElementWithText('span', 'tag', movement.movement_type),
            createElementWithText('strong', '', movement.product_name),
            createElementWithText('span', quantity > 0 ? 'movement-in' : 'movement-out', `${sign}${formatQuantity(Math.abs(quantity), movement.unit)}`)
        );
        item.append(top);

        const details = [];

        if (movement.movement_type === 'Correção') {
            details.push(`de ${formatQuantity(movement.previous_quantity, movement.unit)} para ${formatQuantity(movement.new_quantity, movement.unit)}`);
        }

        if (movement.reason) {
            details.push(movement.reason);
        }

        const when = movement.event_date
            ? new Date(`${movement.event_date}T12:00:00`).toLocaleDateString('pt-PT')
            : new Date(movement.created_at.replace(' ', 'T')).toLocaleDateString('pt-PT');
        details.push(`${when} · ${movement.created_by_email}`);

        item.append(createElementWithText('p', 'movement-details', details.join(' · ')));
        list.append(item);
    });
}
