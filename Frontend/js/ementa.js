// ementa.js: página "Ementa" de cada evento (RF08, RF09, RF10 e RF29).
// Todos os perfis consultam; o Gestor e o Administrador criam, alteram, retiram e copiam artigos.

const CATEGORY_ORDER = ['Bebidas', 'Cocktails', 'Shots', 'Comida', 'Outros'];

// Textos de ajuda que mudam com o tipo de artigo
const TYPE_TEXTS = {
    Direta: {
        hint: 'Vende-se tal como é comprado, ou tirado de um só produto (ex.: garrafa de cerveja, fino).',
        title: 'Sai do stock em cada venda',
        stockHint: 'Escolhe o produto e quanto sai do stock por cada venda. Ex.: fino = 220 ml do barril (200 ml servidos e 20 ml de perdas médias); garrafa = 1 un.'
    },
    Composta: {
        hint: 'Leva vários produtos, com uma receita (ex.: Mojito).',
        title: 'Receita (por cada artigo vendido)',
        stockHint: 'Indica os produtos e a dose de cada um. Os produtos de consumo residual (sal, hortelã...) podem ficar sem quantidade: entram nos custos, mas não descontam em cada venda.'
    }
};

const pageMessage = document.getElementById('pageMessage');
const itemPlanner = document.getElementById('itemPlanner');
const copyPlanner = document.getElementById('copyPlanner');
const itemForm = document.getElementById('itemForm');
const copyForm = document.getElementById('copyForm');
const itemProductList = document.getElementById('itemProductList');

let canManage = false;
let events = [];
let products = [];
let currentEventId = null;
let editingItemId = null;

startMenuPage();

// Todos os perfis entram; os botões de alterar só aparecem ao Gestor e ao Administrador
async function startMenuPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    canManage = hasRole(page.session.role, 'Gestor');

    try {
        events = (await apiListEvents()).events;

        // Os produtos só são precisos para quem altera a ementa (e só esse perfil os pode ver)
        if (canManage) {
            products = (await apiListProducts()).products;
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

    currentEventId = setupEventPicker(events, 'ementa.html', async (eventId) => {
        currentEventId = eventId;
        closePlanners();
        hideMessage(pageMessage);
        await renderMenu();
    });
    setupForms();
    await renderMenu();
}

// ---------- Formulários ----------

function setupForms() {
    if (!canManage) {
        return;
    }

    document.getElementById('newItemButton').addEventListener('click', openNewItem);
    document.getElementById('copyMenuButton').addEventListener('click', openCopy);
    document.querySelectorAll('[data-close-planner]').forEach((button) => {
        button.addEventListener('click', closePlanners);
    });

    itemForm.querySelectorAll('input[name="itemType"]').forEach((input) => {
        input.addEventListener('change', () => applyItemType(true));
    });
    document.getElementById('addItemProductButton').addEventListener('click', () => addProductRow());

    clearErrorsWhileTyping(itemForm);
    itemForm.addEventListener('submit', saveItem);
    copyForm.addEventListener('submit', copyMenu);
}

function closePlanners() {
    itemPlanner.hidden = true;
    copyPlanner.hidden = true;
    editingItemId = null;
}

function showPlanner(planner) {
    planner.hidden = false;
    planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getItemType() {
    return itemForm.querySelector('input[name="itemType"]:checked').value;
}

// Muda os textos e as linhas conforme o tipo: venda direta tem um só produto; composto tem vários
function applyItemType(keepRows) {
    const itemType = getItemType();
    const texts = TYPE_TEXTS[itemType];
    document.getElementById('itemTypeHint').textContent = texts.hint;
    document.getElementById('stockTitle').textContent = texts.title;
    document.getElementById('stockHint').textContent = texts.stockHint;

    const hasProducts = products.length > 0;
    const tracking = isTrackingStock();

    // Evento sem controlo de stock: os produtos são opcionais (o artigo pode ter só nome e preço)
    if (!tracking) {
        document.getElementById('stockHint').textContent = 'Este evento não controla o stock: os produtos são opcionais. O artigo pode ter só o nome e o preço.';
    }

    document.getElementById('noProductsNote').hidden = hasProducts || !tracking;
    document.getElementById('addItemProductButton').hidden = !hasProducts || (tracking && itemType === 'Direta');

    if (!keepRows) {
        updateRemoveButtons();
        return;
    }

    // Ao passar para venda direta fica só a primeira linha
    if (itemType === 'Direta') {
        Array.from(itemProductList.children).slice(1).forEach((row) => row.remove());
    }

    if (tracking && hasProducts && itemProductList.children.length === 0) {
        addProductRow();
    }

    updateRemoveButtons();
}

// O evento escolhido controla o stock?
function isTrackingStock() {
    return eventTracksStock(events.find((item) => item.event_id === currentEventId));
}

// Na venda direta não se tira a única linha; no composto pode tirar-se qualquer uma, menos a última
function updateRemoveButtons() {
    const rows = Array.from(itemProductList.children);
    const tracking = isTrackingStock();
    rows.forEach((row) => {
        row.querySelector('.remove-row').hidden = tracking && rows.length === 1;
    });
}

function resetItemForm() {
    itemForm.reset();
    clearFormErrors(itemForm);
    hideMessage(document.getElementById('itemFormMessage'));
    itemProductList.replaceChildren();
    applyItemType(true);
}

function setItemPlannerMode(title, buttonText) {
    document.getElementById('itemPlannerTitle').textContent = title;
    itemForm.querySelector('button[type="submit"]').textContent = buttonText;
}

function openNewItem() {
    closePlanners();
    hideMessage(pageMessage);
    setItemPlannerMode('Novo artigo', 'Acrescentar à ementa');
    resetItemForm();
    showPlanner(itemPlanner);
    document.getElementById('itemName').focus();
}

// Preenche o formulário com o artigo escolhido
function openEditItem(item) {
    closePlanners();
    hideMessage(pageMessage);
    setItemPlannerMode('Editar artigo', 'Guardar alterações');
    resetItemForm();
    editingItemId = item.menu_item_id;

    document.getElementById('itemName').value = item.item_name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = Number(item.price);
    itemForm.querySelector(`input[name="itemType"][value="${item.item_type}"]`).checked = true;
    applyItemType(false);

    itemProductList.replaceChildren();
    item.products.forEach((line) => addProductRow(line));
    updateRemoveButtons();

    showPlanner(itemPlanner);
}

// Uma linha "produto + quantidade". A unidade (un., ml ou g) vem do produto escolhido.
function addProductRow(line = null) {
    const row = document.getElementById('itemProductTemplate').content.firstElementChild.cloneNode(true);
    const select = row.querySelector('.ip-product');

    products.forEach((product) => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.is_residual ? `${product.product_name} (residual)` : product.product_name;
        select.appendChild(option);
    });

    // Sugere um produto que ainda não esteja escolhido noutra linha
    const chosen = Array.from(itemProductList.querySelectorAll('.ip-product')).map((item) => item.value);
    const free = products.find((product) => !chosen.includes(String(product.product_id)));

    if (line) {
        select.value = line.product_id;
        row.querySelector('.ip-quantity').value = line.quantity !== null ? Number(line.quantity) : '';
    } else if (free) {
        select.value = free.product_id;
    }

    select.addEventListener('change', () => updateRowUnit(row));
    row.querySelector('.remove-row').addEventListener('click', () => {
        row.remove();
        updateRemoveButtons();
    });

    itemProductList.appendChild(row);
    updateRowUnit(row);
    updateRemoveButtons();
}

function findProduct(productId) {
    return products.find((product) => String(product.product_id) === String(productId));
}

function updateRowUnit(row) {
    const product = findProduct(row.querySelector('.ip-product').value);
    const quantityInput = row.querySelector('.ip-quantity');

    if (!product) {
        return;
    }

    row.querySelector('.ip-unit').textContent = UNIT_LABELS[product.unit];
    quantityInput.placeholder = product.is_residual ? 'opcional' : '';
}

function readItemProducts() {
    return Array.from(itemProductList.children).map((row) => ({
        productId: row.querySelector('.ip-product').value,
        quantity: row.querySelector('.ip-quantity').value || null
    }));
}

// Cria um artigo novo ou guarda as alterações, conforme o modo do formulário
async function saveItem(event) {
    event.preventDefault();
    clearFormErrors(itemForm);
    const formMessage = document.getElementById('itemFormMessage');
    hideMessage(formMessage);

    const nameInput = document.getElementById('itemName');
    const priceInput = document.getElementById('itemPrice');

    if (nameInput.value.trim() === '') {
        showFieldError(nameInput, 'Indica o nome do artigo.');
        return;
    }

    if (!(Number(priceInput.value) > 0)) {
        showFieldError(priceInput, 'Indica o preço de venda.');
        return;
    }

    if (isTrackingStock() && itemProductList.children.length === 0) {
        showMessage(formMessage, 'Escolhe pelo menos um produto.', 'is-error');
        return;
    }

    const itemData = {
        itemName: nameInput.value,
        category: document.getElementById('itemCategory').value,
        price: priceInput.value,
        itemType: getItemType(),
        products: readItemProducts()
    };

    try {
        const result = editingItemId
            ? await apiUpdateMenuItem(currentEventId, editingItemId, itemData)
            : await apiCreateMenuItem(currentEventId, itemData);
        closePlanners();
        await renderMenu();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        // A mensagem vem do servidor, ex.: "Já existe um artigo com este nome nesta ementa."
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- Copiar de outro evento (RF10) ----------

function openCopy() {
    closePlanners();
    hideMessage(pageMessage);
    hideMessage(document.getElementById('copyFormMessage'));

    const sourceSelect = document.getElementById('copySourceSelect');
    sourceSelect.replaceChildren();
    events
        .filter((event) => event.event_id !== currentEventId)
        .forEach((event) => {
            const option = document.createElement('option');
            option.value = event.event_id;
            option.textContent = formatEventOption(event);
            sourceSelect.appendChild(option);
        });

    if (sourceSelect.children.length === 0) {
        showMessage(pageMessage, 'Ainda não há outro evento de onde copiar a ementa.', 'is-info');
        return;
    }

    showPlanner(copyPlanner);
}

async function copyMenu(event) {
    event.preventDefault();
    const formMessage = document.getElementById('copyFormMessage');
    hideMessage(formMessage);

    try {
        const result = await apiCopyMenu(currentEventId, document.getElementById('copySourceSelect').value);
        closePlanners();
        await renderMenu();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- A ementa, por categorias ----------

async function renderMenu() {
    let result;

    try {
        result = await apiGetMenu(currentEventId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    const items = result.items;
    document.getElementById('menuBoard').hidden = false;
    document.getElementById('menuTitle').textContent = `Ementa: ${result.event.event_name}`;
    document.getElementById('itemCount').textContent = items.length;
    document.getElementById('menuEmpty').hidden = items.length > 0;

    const sections = document.getElementById('menuSections');
    sections.replaceChildren();

    CATEGORY_ORDER.forEach((category) => {
        const categoryItems = items.filter((item) => item.category === category);

        if (categoryItems.length === 0) {
            return;
        }

        const section = document.createElement('section');
        section.className = 'menu-category';
        section.append(createElementWithText('h3', 'menu-category-title', category));

        const list = document.createElement('ul');
        list.className = 'menu-items';
        categoryItems.forEach((item) => list.appendChild(createMenuLine(item)));
        section.append(list);
        sections.append(section);
    });
}

// Uma linha da carta: nome ........ preço; por baixo, o que sai do stock (só para quem gere)
function createMenuLine(item) {
    const line = document.createElement('li');
    line.className = 'menu-line';

    const top = document.createElement('div');
    top.className = 'menu-line-top';
    top.append(
        createElementWithText('span', 'menu-item-name', item.item_name),
        createElementWithText('span', 'menu-leader', ''),
        createElementWithText('span', 'menu-price', MONEY.format(Number(item.price)))
    );
    line.append(top);

    if (!canManage) {
        return line;
    }

    const details = document.createElement('div');
    details.className = 'menu-line-details';
    details.append(createElementWithText('span', 'tag', item.item_type === 'Direta' ? 'Venda direta' : 'Composto'));
    details.append(createElementWithText('span', 'menu-recipe', describeProducts(item.products)));

    const actions = document.createElement('span');
    actions.className = 'menu-actions';

    const editButton = createElementWithText('button', 'link-button', 'Editar');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Editar ${item.item_name}`);
    editButton.addEventListener('click', () => openEditItem(item));

    // Retirar pede uma segunda confirmação no próprio botão
    const removeButton = createElementWithText('button', 'link-button', 'Retirar');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Retirar ${item.item_name} da ementa`);
    removeButton.addEventListener('click', () => removeItem(item, removeButton));

    actions.append(editButton, removeButton);
    details.append(actions);
    line.append(details);
    return line;
}

// Ex.: "Rum branco 50 ml · Lima 1 un. · Hortelã (residual)"
function describeProducts(lines) {
    return lines.map((line) => {
        if (line.quantity === null) {
            return `${line.product_name} (residual)`;
        }

        return `${line.product_name} ${QUANTITY.format(Number(line.quantity))} ${UNIT_LABELS[line.unit]}`;
    }).join(' · ');
}

async function removeItem(item, button) {
    if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = 'Confirmar retirar';
        return;
    }

    try {
        const result = await apiDeleteMenuItem(currentEventId, item.menu_item_id);
        await renderMenu();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}
