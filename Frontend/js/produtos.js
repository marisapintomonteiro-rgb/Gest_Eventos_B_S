// produtos.js: página "Produtos e fornecedores" (RF07 e RF11, só Gestor e Administrador).
// Cria fornecedores e produtos, liga cada produto aos seus fornecedores e guarda o histórico de preços.

const MONEY = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const QUANTITY = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const UNIT_LABELS = { unidade: 'un.', mililitro: 'ml', grama: 'g' };

// Unidades que se podem escolher no formulário. Na base de dados fica sempre a unidade base
// (unidade, mililitro ou grama), como diz a regra: 1 L = 1000 ml e 1 kg = 1000 g.
const INPUT_UNITS = {
    unidade: { baseUnit: 'unidade', factor: 1, label: 'un.' },
    mililitro: { baseUnit: 'mililitro', factor: 1, label: 'ml' },
    litro: { baseUnit: 'mililitro', factor: 1000, label: 'L' },
    grama: { baseUnit: 'grama', factor: 1, label: 'g' },
    quilograma: { baseUnit: 'grama', factor: 1000, label: 'kg' }
};

const pageMessage = document.getElementById('pageMessage');
const supplierPlanner = document.getElementById('supplierPlanner');
const productPlanner = document.getElementById('productPlanner');
const supplierForm = document.getElementById('supplierForm');
const productForm = document.getElementById('productForm');
const productSupplierList = document.getElementById('productSupplierList');

let suppliers = [];

// Quando se está a editar, guarda o número do fornecedor ou do produto; ao criar, fica null
let editingSupplierId = null;
let editingProductId = null;

startProductsPage();

// Só o Gestor e o Administrador entram nesta página; o servidor confirma o mesmo em cada pedido
async function startProductsPage() {
    const page = await startPrivatePage('Gestor');

    if (!page) {
        return;
    }

    document.getElementById('newSupplierButton').addEventListener('click', () => openPlanner(supplierPlanner));
    document.getElementById('newProductButton').addEventListener('click', () => openPlanner(productPlanner));
    document.querySelectorAll('[data-close-planner]').forEach((button) => {
        button.addEventListener('click', closePlanners);
    });

    document.getElementById('addProductSupplierButton').addEventListener('click', () => addProductSupplierRow());
    productForm.querySelectorAll('input[name="unit"]').forEach((input) => {
        input.addEventListener('change', updateUnitLabels);
    });
    document.getElementById('packageQuantity').addEventListener('input', updateConversionNote);
    document.getElementById('minStock').addEventListener('input', updateConversionNote);

    clearErrorsWhileTyping(supplierForm);
    clearErrorsWhileTyping(productForm);
    supplierForm.addEventListener('submit', saveSupplier);
    productForm.addEventListener('submit', saveProduct);

    await Promise.all([renderSuppliers(), renderProducts()]);
}

// ---------- Abrir e fechar os formulários ----------

function openPlanner(planner) {
    closePlanners();
    hideMessage(pageMessage);
    planner.hidden = false;

    if (planner === productPlanner) {
        resetProductForm();
        document.getElementById('productName').focus();
    } else {
        document.getElementById('supplierName').focus();
    }
}

function closePlanners() {
    supplierPlanner.hidden = true;
    productPlanner.hidden = true;
    supplierForm.reset();
    clearFormErrors(supplierForm);
    hideMessage(document.getElementById('supplierFormMessage'));
    setPlannerMode(supplierPlanner, 'Novo fornecedor', 'Criar fornecedor');
    setPlannerMode(productPlanner, 'Novo produto', 'Criar produto');
    editingSupplierId = null;
    editingProductId = null;
}

// O mesmo formulário serve para criar e para editar: só mudam o título e o texto do botão
function setPlannerMode(planner, title, buttonText) {
    planner.querySelector('h2').textContent = title;
    planner.querySelector('button[type="submit"]').textContent = buttonText;
}

// Abre o formulário no sítio onde está, para quem está no fim da lista
function showPlanner(planner) {
    planner.hidden = false;
    planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Fornecedores ----------

async function renderSuppliers() {
    try {
        const result = await apiListSuppliers();
        suppliers = result.suppliers;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    const list = document.getElementById('supplierList');
    list.replaceChildren();
    document.getElementById('supplierCount').textContent = suppliers.length;
    document.getElementById('suppliersEmpty').hidden = suppliers.length > 0;

    suppliers.forEach((supplier) => {
        const item = document.createElement('li');
        item.append(createElementWithText('strong', 'supplier-name', supplier.supplier_name));

        const details = [supplier.contact, supplier.email, supplier.nif ? `NIF ${supplier.nif}` : null]
            .filter(Boolean)
            .join(', ');
        item.append(createElementWithText('span', 'supplier-details', details));

        if (supplier.accepts_returns) {
            item.append(createElementWithText('span', 'tag tag-you', 'Aceita devoluções'));
        }

        const editButton = createElementWithText('button', 'link-button edit-button', 'Editar');
        editButton.type = 'button';
        editButton.setAttribute('aria-label', `Editar ${supplier.supplier_name}`);
        editButton.addEventListener('click', () => openSupplierEditor(supplier));
        item.append(editButton);

        list.appendChild(item);
    });
}

// Preenche o formulário com os dados do fornecedor escolhido
function openSupplierEditor(supplier) {
    closePlanners();
    hideMessage(pageMessage);
    editingSupplierId = supplier.supplier_id;
    setPlannerMode(supplierPlanner, 'Editar fornecedor', 'Guardar alterações');

    document.getElementById('supplierName').value = supplier.supplier_name;
    document.getElementById('supplierContact').value = supplier.contact;
    document.getElementById('supplierEmail').value = supplier.email || '';
    document.getElementById('supplierNif').value = supplier.nif || '';
    document.getElementById('supplierAddress').value = supplier.address || '';
    document.getElementById('supplierAcceptsReturns').checked = Boolean(supplier.accepts_returns);

    showPlanner(supplierPlanner);
}

// Cria um fornecedor novo ou guarda as alterações, conforme o modo do formulário
async function saveSupplier(event) {
    event.preventDefault();
    clearFormErrors(supplierForm);
    const formMessage = document.getElementById('supplierFormMessage');
    hideMessage(formMessage);

    const nameInput = document.getElementById('supplierName');
    const contactInput = document.getElementById('supplierContact');

    if (nameInput.value.trim() === '') {
        showFieldError(nameInput, 'Indica o nome do fornecedor.');
        return;
    }

    // Telefone com 9 algarismos; aceita espaços e o indicativo +351 (o servidor volta a confirmar)
    if (!/^(\+351)?\d{9}$/.test(contactInput.value.replace(/\s/g, ''))) {
        showFieldError(contactInput, 'O telefone tem de ter 9 algarismos (ex.: 912 345 678).');
        return;
    }

    const supplierData = {
        supplierName: nameInput.value,
        contact: contactInput.value,
        email: document.getElementById('supplierEmail').value,
        nif: document.getElementById('supplierNif').value,
        address: document.getElementById('supplierAddress').value,
        acceptsReturns: document.getElementById('supplierAcceptsReturns').checked
    };

    try {
        const result = editingSupplierId
            ? await apiUpdateSupplier(editingSupplierId, supplierData)
            : await apiCreateSupplier(supplierData);
        closePlanners();
        // O nome do fornecedor também aparece nos produtos
        await Promise.all([renderSuppliers(), renderProducts()]);
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- Formulário do produto ----------

function resetProductForm() {
    productForm.reset();
    clearFormErrors(productForm);
    hideMessage(document.getElementById('productFormMessage'));
    productSupplierList.replaceChildren();
    updateUnitLabels();

    const hasSuppliers = suppliers.length > 0;
    document.getElementById('noSuppliersNote').hidden = hasSuppliers;
    document.getElementById('addProductSupplierButton').hidden = !hasSuppliers;

    // Começa com uma linha, já marcada como fornecedor principal
    if (hasSuppliers) {
        addProductSupplierRow();
        productSupplierList.querySelector('.ps-main').checked = true;
    }
}

// Mostra a unidade escolhida ao lado das quantidades (un., ml ou g)
function updateUnitLabels() {
    const inputUnit = getChosenUnit();
    document.querySelectorAll('[data-unit-label]').forEach((label) => {
        label.textContent = inputUnit.label;
    });
    updateConversionNote();
}

function getChosenUnit() {
    return INPUT_UNITS[productForm.querySelector('input[name="unit"]:checked').value];
}

// Passa o valor escrito para a unidade base (ex.: 30 L passa a 30000 ml). Arredonda a 2 casas.
function toBaseQuantity(value, inputUnit) {
    if (value === '') {
        return null;
    }

    return Math.round(Number(value) * inputUnit.factor * 100) / 100;
}

// Quando se escolhe litros ou kg, mostra como vai ficar guardado (ex.: "Fica guardado: 30 000 ml")
function updateConversionNote() {
    const note = document.getElementById('conversionNote');
    const inputUnit = getChosenUnit();
    const packageValue = document.getElementById('packageQuantity').value;
    const minValue = document.getElementById('minStock').value;

    if (inputUnit.factor === 1 || (packageValue === '' && minValue === '')) {
        note.hidden = true;
        return;
    }

    const parts = [];

    if (packageValue !== '') {
        parts.push(`embalagem de ${QUANTITY.format(toBaseQuantity(packageValue, inputUnit))} ${UNIT_LABELS[inputUnit.baseUnit]}`);
    }

    if (minValue !== '') {
        parts.push(`stock mínimo de ${QUANTITY.format(toBaseQuantity(minValue, inputUnit))} ${UNIT_LABELS[inputUnit.baseUnit]}`);
    }

    note.textContent = `Fica guardado: ${parts.join('; ')}.`;
    note.hidden = false;
}

// Uma linha de fornecedor no formulário do produto.
// Se "link" vier preenchido, é um fornecedor que já está ligado ao produto (ao editar).
function addProductSupplierRow(link = null) {
    const row = document.getElementById('productSupplierTemplate').content.firstElementChild.cloneNode(true);
    const select = row.querySelector('.ps-supplier');

    suppliers.forEach((supplier) => {
        const option = document.createElement('option');
        option.value = supplier.supplier_id;
        option.textContent = supplier.supplier_name;
        select.appendChild(option);
    });

    // Sugere um fornecedor que ainda não esteja escolhido noutra linha
    const chosen = Array.from(productSupplierList.querySelectorAll('.ps-supplier')).map((item) => item.value);
    const free = suppliers.find((supplier) => !chosen.includes(String(supplier.supplier_id)));

    if (free) {
        select.value = free.supplier_id;
    }

    // Um fornecedor já ligado não se troca nem se tira (tem histórico de preços);
    // o preço muda-se no cartão do produto, com "Novo preço"
    if (link) {
        select.value = link.supplier_id;
        select.disabled = true;
        row.querySelector('.ps-main').checked = Boolean(link.is_main);
        row.querySelector('.ps-price').closest('label').replaceWith(
            createElementWithText('p', 'linked-note', 'Preço: usa "Novo preço" no cartão')
        );
        row.querySelector('.remove-row').remove();
        row.classList.add('is-linked');
    } else {
        row.querySelector('.remove-row').addEventListener('click', () => row.remove());
    }

    productSupplierList.appendChild(row);
}

function readProductSuppliers() {
    return Array.from(productSupplierList.children).map((row) => {
        const priceInput = row.querySelector('.ps-price');

        return {
            supplierId: row.querySelector('.ps-supplier').value,
            packagePrice: priceInput ? priceInput.value || null : null,
            isMain: row.querySelector('.ps-main').checked
        };
    });
}

// Preenche o formulário com os dados do produto escolhido
function openProductEditor(product) {
    closePlanners();
    hideMessage(pageMessage);
    resetProductForm();
    productSupplierList.replaceChildren();
    editingProductId = product.product_id;
    setPlannerMode(productPlanner, 'Editar produto', 'Guardar alterações');

    document.getElementById('productName').value = product.product_name;
    // Embalagens de 1000 ml ou mais aparecem em litros (e 1000 g ou mais em kg), como se escreveu ao criar
    let unitChoice = product.unit;

    if (product.unit !== 'unidade' && Number(product.package_quantity) >= 1000) {
        unitChoice = product.unit === 'mililitro' ? 'litro' : 'quilograma';
    }

    const factor = INPUT_UNITS[unitChoice].factor;
    productForm.querySelector(`input[name="unit"][value="${unitChoice}"]`).checked = true;
    document.getElementById('packageQuantity').value = Number(product.package_quantity) / factor;
    document.getElementById('minStock').value = product.min_stock !== null ? Number(product.min_stock) / factor : '';
    updateUnitLabels();
    document.getElementById('isPerishable').checked = Boolean(product.is_perishable);
    document.getElementById('isResidual').checked = Boolean(product.is_residual);

    product.suppliers.forEach((link) => addProductSupplierRow(link));

    showPlanner(productPlanner);
}

// Cria um produto novo ou guarda as alterações, conforme o modo do formulário
async function saveProduct(event) {
    event.preventDefault();
    clearFormErrors(productForm);
    const formMessage = document.getElementById('productFormMessage');
    hideMessage(formMessage);

    const nameInput = document.getElementById('productName');
    const packageInput = document.getElementById('packageQuantity');

    if (nameInput.value.trim() === '') {
        showFieldError(nameInput, 'Indica o nome do produto.');
        return;
    }

    if (!(Number(packageInput.value) > 0)) {
        showFieldError(packageInput, 'Indica quanto tem cada embalagem.');
        return;
    }

    // O servidor recebe sempre a unidade base: ml, g ou unidades
    const inputUnit = getChosenUnit();
    const productData = {
        productName: nameInput.value,
        unit: inputUnit.baseUnit,
        packageQuantity: toBaseQuantity(packageInput.value, inputUnit),
        minStock: toBaseQuantity(document.getElementById('minStock').value, inputUnit),
        isPerishable: document.getElementById('isPerishable').checked,
        isResidual: document.getElementById('isResidual').checked,
        suppliers: readProductSuppliers()
    };

    try {
        const result = editingProductId
            ? await apiUpdateProduct(editingProductId, productData)
            : await apiCreateProduct(productData);
        closePlanners();
        await renderProducts();
        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        // A mensagem vem do servidor, ex.: "Já existe um produto com este nome."
        showMessage(formMessage, error.message, 'is-error');
    }
}

// ---------- Lista dos produtos ----------

async function renderProducts() {
    let products;

    try {
        const result = await apiListProducts();
        products = result.products;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    const list = document.getElementById('productList');
    list.replaceChildren();
    document.getElementById('productCount').textContent = products.length;
    document.getElementById('productsEmpty').hidden = products.length > 0;

    products.forEach((product) => list.appendChild(createProductCard(product)));
}

// Mostra a quantidade guardada; a partir de 1000 ml ou 1000 g mostra também em L ou kg
// (ex.: "30 L (30 000 ml)")
function formatQuantity(value, unit) {
    const amount = Number(value);
    const base = `${QUANTITY.format(amount)} ${UNIT_LABELS[unit]}`;

    if (unit !== 'unidade' && amount >= 1000) {
        const bigLabel = unit === 'mililitro' ? 'L' : 'kg';
        return `${QUANTITY.format(amount / 1000)} ${bigLabel} (${base})`;
    }

    return base;
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const top = document.createElement('div');
    top.className = 'product-top';
    top.append(createElementWithText('h3', 'product-name', product.product_name));

    if (product.is_perishable) {
        top.append(createElementWithText('span', 'tag', 'Perecível'));
    }

    if (product.is_residual) {
        top.append(createElementWithText('span', 'tag', 'Consumo residual'));
    }

    const editButton = createElementWithText('button', 'link-button edit-button', 'Editar');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Editar ${product.product_name}`);
    editButton.addEventListener('click', () => openProductEditor(product));
    top.append(editButton);

    card.append(top);

    let facts = `Embalagem de ${formatQuantity(product.package_quantity, product.unit)}`;

    if (product.min_stock !== null) {
        facts += `; stock mínimo de ${formatQuantity(product.min_stock, product.unit)}`;
    }

    card.append(createElementWithText('p', 'product-facts', facts));

    if (product.suppliers.length === 0) {
        card.append(createElementWithText('p', 'product-facts', 'Sem fornecedor associado.'));
        return card;
    }

    const supplierLines = document.createElement('ul');
    supplierLines.className = 'price-lines';
    product.suppliers.forEach((link) => supplierLines.appendChild(createPriceLine(product, link)));
    card.append(supplierLines);

    const historyButton = createElementWithText('button', 'link-button', 'Ver histórico de preços');
    historyButton.type = 'button';
    const history = document.createElement('ol');
    history.className = 'price-history';
    history.hidden = true;
    historyButton.addEventListener('click', () => toggleHistory(product, history, historyButton));
    card.append(historyButton, history);

    return card;
}

// Uma linha por fornecedor: principal ou alternativo, o preço atual e o botão para mudar o preço
function createPriceLine(product, link) {
    const line = document.createElement('li');

    const who = document.createElement('span');
    who.className = 'price-supplier';
    who.append(createElementWithText('span', link.is_main ? 'role-chip role-colaborador' : 'tag', link.is_main ? 'Principal' : 'Alternativo'));
    who.append(` ${link.supplier_name}`);

    const price = document.createElement('span');
    price.className = 'price-value';
    price.textContent = link.latest_price !== null ? MONEY.format(Number(link.latest_price)) : 'sem preço';

    if (link.latest_price_date) {
        price.append(createElementWithText('small', '', ` desde ${new Date(link.latest_price_date.replace(' ', 'T')).toLocaleDateString('pt-PT')}`));
    }

    const changeButton = createElementWithText('button', 'button button-ghost button-small', 'Novo preço');
    changeButton.type = 'button';

    const priceForm = document.createElement('form');
    priceForm.className = 'price-form';
    priceForm.hidden = true;
    priceForm.innerHTML = '<input type="number" min="0" step="0.01" inputmode="decimal" aria-label="Preço novo da embalagem (€)" placeholder="€ por embalagem"><button class="button button-small" type="submit">Guardar</button>';

    changeButton.addEventListener('click', () => {
        priceForm.hidden = !priceForm.hidden;
        priceForm.querySelector('input').focus();
    });

    priceForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const result = await apiAddPrice(product.product_id, link.supplier_id, priceForm.querySelector('input').value);
            await renderProducts();
            showMessage(pageMessage, result.message, 'is-success');
        } catch (error) {
            showMessage(pageMessage, error.message, 'is-error');
        }
    });

    line.append(who, price, changeButton, priceForm);
    return line;
}

async function toggleHistory(product, history, button) {
    if (!history.hidden) {
        history.hidden = true;
        button.textContent = 'Ver histórico de preços';
        return;
    }

    try {
        const result = await apiListPrices(product.product_id);
        history.replaceChildren();

        if (result.prices.length === 0) {
            history.append(createElementWithText('li', '', 'Ainda não há preços registados.'));
        }

        result.prices.forEach((price) => {
            const date = new Date(price.created_at.replace(' ', 'T')).toLocaleDateString('pt-PT');
            history.append(createElementWithText('li', '', `${date}: ${MONEY.format(Number(price.package_price))} (${price.supplier_name})`));
        });

        history.hidden = false;
        button.textContent = 'Esconder histórico';
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

function createElementWithText(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    return element;
}
