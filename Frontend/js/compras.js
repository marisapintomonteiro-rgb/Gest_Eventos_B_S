// compras.js: página "Compras" de cada evento (RF12, só Gestor e Administrador).
// Regista compras em embalagens, mostra as compras do evento e o stock que criaram.

const pageMessage = document.getElementById('pageMessage');
const purchasePlanner = document.getElementById('purchasePlanner');
const purchaseForm = document.getElementById('purchaseForm');
const purchaseLineList = document.getElementById('purchaseLineList');
const supplierSelect = document.getElementById('purchaseSupplier');

let events = [];
let products = [];
let suppliers = [];
let currentEventId = null;

startPurchasesPage();

// Só o Gestor e o Administrador entram nesta página; o servidor confirma o mesmo em cada pedido
async function startPurchasesPage() {
    const page = await startPrivatePage('Gestor');

    if (!page) {
        return;
    }

    try {
        const [eventResult, productResult, supplierResult] = await Promise.all([
            apiListEvents(), apiListProducts(), apiListSuppliers()
        ]);
        events = eventResult.events;
        products = productResult.products;
        suppliers = supplierResult.suppliers;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    if (events.length === 0) {
        document.getElementById('noEventsNote').hidden = false;
        document.querySelector('.heading-actions').hidden = true;
        return;
    }

    currentEventId = setupEventPicker(events, 'compras.html', async (eventId) => {
        currentEventId = eventId;
        purchasePlanner.hidden = true;
        hideMessage(pageMessage);
        await renderPurchases();
    });

    setupForm();
    await renderPurchases();
}

// ---------- Formulário da compra ----------

function setupForm() {
    suppliers.forEach((supplier) => {
        const option = document.createElement('option');
        option.value = supplier.supplier_id;
        option.textContent = supplier.supplier_name;
        supplierSelect.appendChild(option);
    });

    document.getElementById('newPurchaseButton').addEventListener('click', () => openPurchaseForm());
    document.getElementById('forecastButton').addEventListener('click', toggleForecast);
    document.getElementById('previousForm').addEventListener('submit', savePreviousEvent);
    document.getElementById('marginForm').addEventListener('submit', (event) => {
        event.preventDefault();
        renderForecast();
    });
    document.querySelector('[data-close-planner]').addEventListener('click', () => {
        purchasePlanner.hidden = true;
    });
    document.getElementById('addPurchaseLineButton').addEventListener('click', () => addPurchaseLine());

    // Ao mudar de fornecedor, os preços sugeridos passam a ser os desse fornecedor
    supplierSelect.addEventListener('change', () => {
        Array.from(purchaseLineList.children).forEach((row) => suggestPrice(row));
        updateTotals();
    });

    clearErrorsWhileTyping(purchaseForm);
    purchaseForm.addEventListener('submit', savePurchase);
}

// Abre o formulário vazio, ou já preenchido pela previsão (prefill: fornecedor e linhas)
function openPurchaseForm(prefill = null) {
    hideMessage(pageMessage);
    purchaseForm.reset();
    clearFormErrors(purchaseForm);
    hideMessage(document.getElementById('purchaseFormMessage'));
    purchaseLineList.replaceChildren();

    const canBuy = products.length > 0 && suppliers.length > 0;
    document.getElementById('noProductsNote').hidden = canBuy;
    document.getElementById('addPurchaseLineButton').hidden = !canBuy;

    // Data sugerida: hoje, ou o último dia do evento se o evento já passou
    const event = events.find((item) => item.event_id === currentEventId);
    const today = new Date().toLocaleDateString('sv-SE');
    const dateInput = document.getElementById('purchaseDate');
    dateInput.value = event.last_day && today > event.last_day ? event.last_day : today;
    dateInput.max = event.last_day || '';

    if (canBuy && prefill) {
        supplierSelect.value = prefill.supplierId;
        prefill.lines.forEach((line) => addPurchaseLine(line));
    } else if (canBuy) {
        addPurchaseLine();
    }

    updateTotals();
    purchasePlanner.hidden = false;
    purchasePlanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function findProduct(productId) {
    return products.find((product) => String(product.product_id) === String(productId));
}

// Uma linha: produto, número de embalagens e preço de cada embalagem (line: valores já preenchidos)
function addPurchaseLine(line = null) {
    const row = document.getElementById('purchaseLineTemplate').content.firstElementChild.cloneNode(true);
    const select = row.querySelector('.pl-product');

    products.forEach((product) => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.product_name;
        select.appendChild(option);
    });

    // Sugere um produto que ainda não esteja escolhido noutra linha
    const chosen = Array.from(purchaseLineList.querySelectorAll('.pl-product')).map((item) => item.value);
    const free = products.find((product) => !chosen.includes(String(product.product_id)));

    if (free) {
        select.value = free.product_id;
    }

    select.addEventListener('change', () => {
        suggestPrice(row);
        updateTotals();
    });
    row.querySelector('.pl-packages').addEventListener('input', updateTotals);
    row.querySelector('.pl-price').addEventListener('input', updateTotals);
    row.querySelector('.remove-row').addEventListener('click', () => {
        row.remove();
        updateTotals();
    });

    if (line) {
        select.value = line.productId;
    }

    purchaseLineList.appendChild(row);
    suggestPrice(row);

    if (line) {
        row.querySelector('.pl-packages').value = line.packages;
    }

    updateTotals();
}

// Preenche o preço com o último preço deste produto neste fornecedor (pode ser alterado)
function suggestPrice(row) {
    const product = findProduct(row.querySelector('.pl-product').value);
    const link = product.suppliers.find((item) => String(item.supplier_id) === supplierSelect.value);
    row.querySelector('.pl-price').value = link && link.latest_price !== null ? Number(link.latest_price) : '';
}

// Mostra, em cada linha, o que entra no stock e o valor; e o total da compra no fim
function updateTotals() {
    let total = 0;

    Array.from(purchaseLineList.children).forEach((row) => {
        const product = findProduct(row.querySelector('.pl-product').value);
        const packages = Number(row.querySelector('.pl-packages').value) || 0;
        const price = Number(row.querySelector('.pl-price').value) || 0;
        const lineTotal = packages * price;
        total += lineTotal;

        const stockIn = formatQuantity(packages * Number(product.package_quantity), product.unit);
        row.querySelector('.pl-packages').title = `Cada embalagem tem ${formatQuantity(product.package_quantity, product.unit)}`;
        row.querySelector('.purchase-line-info').textContent = `Entra no stock: ${stockIn} · ${MONEY.format(lineTotal)}`;
    });

    document.getElementById('purchaseTotal').textContent = MONEY.format(total);

    // Na única linha não aparece o botão de tirar
    const rows = Array.from(purchaseLineList.children);
    rows.forEach((row) => {
        row.querySelector('.remove-row').hidden = rows.length === 1;
    });
}

async function savePurchase(event) {
    event.preventDefault();
    clearFormErrors(purchaseForm);
    const formMessage = document.getElementById('purchaseFormMessage');
    hideMessage(formMessage);

    const dateInput = document.getElementById('purchaseDate');

    if (dateInput.value === '') {
        showFieldError(dateInput, 'Indica a data da compra.');
        return;
    }

    if (purchaseLineList.children.length === 0) {
        showMessage(formMessage, 'Acrescenta pelo menos um produto.', 'is-error');
        return;
    }

    const lines = Array.from(purchaseLineList.children).map((row) => ({
        productId: row.querySelector('.pl-product').value,
        packages: row.querySelector('.pl-packages').value,
        packagePrice: row.querySelector('.pl-price').value
    }));

    try {
        const result = await apiCreatePurchase(currentEventId, {
            supplierId: supplierSelect.value,
            purchaseDate: dateInput.value,
            notes: document.getElementById('purchaseNotes').value,
            lines
        });
        purchasePlanner.hidden = true;

        // Os preços sugeridos podem ter mudado (a compra atualiza o histórico de preços)
        products = (await apiListProducts()).products;
        await renderPurchases();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        // A mensagem vem do servidor, ex.: "A data da compra não pode ser depois do último dia do evento."
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- Compras e stock do evento ----------

async function renderPurchases() {
    let result;

    try {
        result = await apiListPurchases(currentEventId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    document.getElementById('purchaseLayout').hidden = false;
    renderPurchaseList(result.purchases);
    renderStock(result.stock);
    await renderReturns();
}

// ---------- Devoluções a fornecedores (RF22) ----------

async function renderReturns() {
    let result;

    try {
        result = await apiListReturns(currentEventId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    document.getElementById('returnsPanel').hidden = false;

    const returnable = document.getElementById('returnableList');
    returnable.replaceChildren();
    document.getElementById('returnableEmpty').hidden = result.returnable.length > 0;
    result.returnable.forEach((line) => returnable.append(createReturnableLine(line)));

    const list = document.getElementById('returnList');
    list.replaceChildren();
    document.getElementById('returnsEmpty').hidden = result.returns.length > 0;

    result.returns.forEach((item) => {
        const line = document.createElement('li');
        const text = document.createElement('div');
        text.append(
            createElementWithText('strong', '', `${QUANTITY.format(Number(item.packages))} × ${item.product_name}`),
            createElementWithText('span', 'expense-meta', `${item.supplier_name} · ${new Date(`${item.return_date}T12:00:00`).toLocaleDateString('pt-PT')}`)
        );

        const deleteButton = createElementWithText('button', 'link-button', 'Apagar');
        deleteButton.type = 'button';
        deleteButton.setAttribute('aria-label', `Apagar a devolução de ${item.product_name}`);
        deleteButton.addEventListener('click', () => deleteReturn(item, deleteButton));

        line.append(text, createElementWithText('span', 'receipt-amount', `+${MONEY.format(Number(item.packages) * Number(item.package_price))}`), deleteButton);
        list.append(line);
    });
}

// Uma linha por fornecedor e produto: o que foi comprado, a sugestão e o formulário para confirmar
function createReturnableLine(line) {
    const form = document.createElement('form');
    form.className = 'returnable-line';
    form.noValidate = true;

    const info = document.createElement('div');
    info.append(
        createElementWithText('strong', '', `${line.productName} · ${line.supplierName}`),
        createElementWithText('span', 'expense-meta',
            `Compradas ${QUANTITY.format(line.packagesBought)} embalagens de ${formatQuantity(line.packageQuantity, line.unit)}`
            + (line.packagesReturned > 0 ? `, já devolvidas ${QUANTITY.format(line.packagesReturned)}` : '')
            + ` · sugestão: ${line.suggested} fechadas`)
    );

    const packagesInput = document.createElement('input');
    packagesInput.type = 'number';
    packagesInput.min = '1';
    packagesInput.step = '1';
    packagesInput.value = line.suggested;
    packagesInput.setAttribute('aria-label', `Embalagens de ${line.productName} a devolver`);

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = line.averagePrice;
    priceInput.setAttribute('aria-label', `Valor devolvido por embalagem de ${line.productName} (€)`);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = new Date().toLocaleDateString('sv-SE');
    dateInput.setAttribute('aria-label', 'Data da devolução');

    const button = createElementWithText('button', 'button button-small', 'Devolver');
    button.type = 'submit';
    button.disabled = line.suggested === 0 && line.packagesBought <= line.packagesReturned;

    const fields = document.createElement('div');
    fields.className = 'returnable-fields';
    fields.append(
        labelWrap('Embalagens', packagesInput),
        labelWrap('€ por embalagem', priceInput),
        labelWrap('Data', dateInput),
        button
    );

    form.append(info, fields);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const result = await apiCreateReturn(currentEventId, {
                supplierId: line.supplierId,
                productId: line.productId,
                packages: packagesInput.value,
                packagePrice: priceInput.value,
                returnDate: dateInput.value
            });
            await renderPurchases();
            showMessage(pageMessage, result.message, 'is-success');
        } catch (error) {
            showMessage(pageMessage, error.message, 'is-error');
        }
    });

    return form;
}

function labelWrap(text, input) {
    const label = document.createElement('label');
    label.append(text, input);
    return label;
}

async function deleteReturn(item, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar';
        return;
    }

    try {
        const result = await apiDeleteReturn(currentEventId, item.return_id);
        await renderPurchases();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

function getPurchaseTotal(purchase) {
    return purchase.lines.reduce((sum, line) => sum + Number(line.packages) * Number(line.package_price), 0);
}

function renderPurchaseList(purchases) {
    const list = document.getElementById('purchaseList');
    list.replaceChildren();
    document.getElementById('purchaseCount').textContent = purchases.length;
    document.getElementById('purchasesEmpty').hidden = purchases.length > 0;

    const sum = purchases.reduce((total, purchase) => total + getPurchaseTotal(purchase), 0);
    const sumLine = document.getElementById('purchasesSum');
    sumLine.hidden = purchases.length === 0;
    sumLine.textContent = `Total gasto em compras: ${MONEY.format(sum)}`;

    purchases.forEach((purchase) => list.appendChild(createReceipt(purchase)));
}

// Uma compra, como um talão: data e fornecedor, os produtos e o total
function createReceipt(purchase) {
    const receipt = document.createElement('article');
    receipt.className = 'receipt';

    const head = document.createElement('div');
    head.className = 'receipt-head';
    head.append(
        createElementWithText('strong', '', purchase.supplier_name),
        createElementWithText('span', 'receipt-date', new Date(`${purchase.purchase_date}T12:00:00`).toLocaleDateString('pt-PT'))
    );
    receipt.append(head);

    const lines = document.createElement('ul');
    lines.className = 'receipt-lines';

    purchase.lines.forEach((line) => {
        const item = document.createElement('li');
        const packageSize = formatQuantity(line.package_quantity, line.unit);
        item.append(
            createElementWithText('span', '', `${QUANTITY.format(Number(line.packages))} × ${line.product_name} · ${packageSize}`),
            createElementWithText('span', 'receipt-amount', MONEY.format(Number(line.packages) * Number(line.package_price)))
        );
        lines.append(item);
    });

    receipt.append(lines);

    if (purchase.notes) {
        receipt.append(createElementWithText('p', 'receipt-notes', purchase.notes));
    }

    const foot = document.createElement('div');
    foot.className = 'receipt-foot';

    // Apagar pede uma segunda confirmação no próprio botão
    const deleteButton = createElementWithText('button', 'link-button', 'Apagar');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Apagar a compra de ${purchase.supplier_name}`);
    deleteButton.addEventListener('click', () => deletePurchase(purchase, deleteButton));

    foot.append(deleteButton, createElementWithText('strong', 'receipt-total', `Total ${MONEY.format(getPurchaseTotal(purchase))}`));
    receipt.append(foot);
    return receipt;
}

async function deletePurchase(purchase, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar apagar';
        return;
    }

    try {
        const result = await apiDeletePurchase(currentEventId, purchase.purchase_id);
        await renderPurchases();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

// Stock por produto. Se ficar igual ou abaixo do stock mínimo, aparece o aviso (RF18).
function renderStock(stock) {
    const list = document.getElementById('stockList');
    list.replaceChildren();
    document.getElementById('stockEmpty').hidden = stock.length > 0;

    stock.forEach((row) => {
        const item = document.createElement('li');
        item.append(
            createElementWithText('span', 'stock-name', row.product_name),
            createElementWithText('span', 'stock-quantity', formatQuantity(row.quantity, row.unit))
        );

        if (row.min_stock !== null && Number(row.quantity) <= Number(row.min_stock)) {
            item.classList.add('is-low');
            item.append(createElementWithText('span', 'stock-alert', `Stock baixo (mínimo ${formatQuantity(row.min_stock, row.unit)})`));
        }

        list.append(item);
    });
}

// ---------- Previsão de compras (RF13) ----------
// Usa o que se gastou na edição anterior do mesmo evento, mais a margem de segurança.

function toggleForecast() {
    const panel = document.getElementById('forecastPanel');
    panel.hidden = !panel.hidden;

    if (!panel.hidden) {
        fillPreviousSelect();
        renderForecast();
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Só podem ser edição anterior os eventos que começaram antes deste
function fillPreviousSelect() {
    const current = events.find((item) => item.event_id === currentEventId);
    const select = document.getElementById('previousSelect');
    select.replaceChildren(new Option('Sem edição anterior', ''));

    events
        .filter((item) => item.event_id !== currentEventId && item.first_day && current.first_day && item.first_day < current.first_day)
        .forEach((item) => select.append(new Option(formatEventOption(item), item.event_id)));
}

async function savePreviousEvent(event) {
    event.preventDefault();

    try {
        const result = await apiSetPreviousEvent(currentEventId, document.getElementById('previousSelect').value);
        showMessage(pageMessage, result.message, 'is-success');
        await renderForecast();
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

async function renderForecast() {
    const marginInput = document.getElementById('marginInput');
    let result;

    try {
        result = await apiGetForecast(currentEventId, marginInput.value);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    document.getElementById('previousSelect').value = result.previous ? result.previous.event_id : '';
    marginInput.value = result.margin;

    const body = document.getElementById('forecastRows');
    body.replaceChildren();
    const hasLines = result.lines.length > 0;
    document.getElementById('forecastTableWrap').hidden = !hasLines;
    document.getElementById('forecastActions').replaceChildren();

    const empty = document.getElementById('forecastEmpty');
    empty.hidden = hasLines;
    empty.textContent = result.previous
        ? 'A edição anterior não tem consumos registados. Indica as quantidades à mão, em "Nova compra".'
        : 'Escolhe a edição anterior deste evento para ver a sugestão. Sem histórico, as quantidades introduzem-se à mão, em "Nova compra".';

    result.lines.forEach((line) => body.append(createForecastRow(line)));
    updateForecastTotals(result.lines);
}

// Uma linha da previsão. "A comprar" pode ser ajustado (RF13: o utilizador ajusta as sugestões).
function createForecastRow(line) {
    const tr = document.createElement('tr');
    tr.dataset.productId = line.productId;

    const toBuyInput = document.createElement('input');
    toBuyInput.type = 'number';
    toBuyInput.min = '0';
    toBuyInput.step = '1';
    toBuyInput.value = line.toBuy;
    toBuyInput.className = 'forecast-input';
    toBuyInput.setAttribute('aria-label', `Embalagens de ${line.productName} a comprar`);
    toBuyInput.addEventListener('input', () => updateForecastTotals());

    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.append(createElementWithText('span', '', line.productName));
    nameCell.append(createElementWithText('small', 'forecast-supplier', line.supplierName ? line.supplierName : 'sem fornecedor'));

    const toBuyCell = document.createElement('td');
    toBuyCell.append(toBuyInput);

    tr.append(
        nameCell,
        createElementWithText('td', '', formatQuantity(line.consumed, line.unit)),
        createElementWithText('td', '', `${line.suggestedPackages} × ${formatQuantity(line.packageQuantity, line.unit)}`),
        createElementWithText('td', '', QUANTITY.format(line.boughtPackages)),
        toBuyCell,
        createElementWithText('td', 'forecast-cost', '')
    );

    tr.forecastLine = line;
    return tr;
}

// Custo estimado de cada linha (preço mais recente do fornecedor principal) e botões para preparar as compras
function updateForecastTotals() {
    const rows = Array.from(document.getElementById('forecastRows').children);
    const groups = {};
    let total = 0;

    rows.forEach((tr) => {
        const line = tr.forecastLine;
        const packages = Math.max(0, Math.floor(Number(tr.querySelector('.forecast-input').value) || 0));
        const cost = line.packagePrice !== null ? packages * line.packagePrice : null;
        tr.querySelector('.forecast-cost').textContent = cost !== null ? MONEY.format(cost) : '—';
        total += cost || 0;

        if (packages > 0 && line.supplierId !== null) {
            if (!groups[line.supplierId]) {
                groups[line.supplierId] = { supplierId: line.supplierId, supplierName: line.supplierName, lines: [] };
            }

            groups[line.supplierId].lines.push({ productId: line.productId, packages });
        }
    });

    document.getElementById('forecastTotal').textContent = MONEY.format(total);

    // Uma compra por fornecedor principal: o botão abre a "Nova compra" já preenchida
    const actions = document.getElementById('forecastActions');
    actions.replaceChildren();

    Object.values(groups).forEach((group) => {
        const button = createElementWithText('button', 'button button-ghost button-small', `Preparar compra a ${group.supplierName}`);
        button.type = 'button';
        button.addEventListener('click', () => openPurchaseForm(group));
        actions.append(button);
    });
}
