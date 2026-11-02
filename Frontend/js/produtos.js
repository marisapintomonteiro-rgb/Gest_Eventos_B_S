// produtos.js: página "Produtos e fornecedores" (RF07 e RF11, só Gestor e Administrador).
// Cria fornecedores e produtos, liga cada produto aos seus fornecedores e guarda o histórico de preços.

const MONEY = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const QUANTITY = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const UNIT_LABELS = { unidade: 'un.', mililitro: 'ml', grama: 'g' };

const pageMessage = document.getElementById('pageMessage');
const supplierPlanner = document.getElementById('supplierPlanner');
const productPlanner = document.getElementById('productPlanner');
const supplierForm = document.getElementById('supplierForm');
const productForm = document.getElementById('productForm');
const productSupplierList = document.getElementById('productSupplierList');

let suppliers = [];

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

    clearErrorsWhileTyping(supplierForm);
    clearErrorsWhileTyping(productForm);
    supplierForm.addEventListener('submit', createSupplier);
    productForm.addEventListener('submit', createProduct);

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

        list.appendChild(item);
    });
}

async function createSupplier(event) {
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

    try {
        const result = await apiCreateSupplier({
            supplierName: nameInput.value,
            contact: contactInput.value,
            email: document.getElementById('supplierEmail').value,
            nif: document.getElementById('supplierNif').value,
            address: document.getElementById('supplierAddress').value,
            acceptsReturns: document.getElementById('supplierAcceptsReturns').checked
        });
        closePlanners();
        await renderSuppliers();
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
    const unit = productForm.querySelector('input[name="unit"]:checked').value;
    document.querySelectorAll('[data-unit-label]').forEach((label) => {
        label.textContent = UNIT_LABELS[unit];
    });
}

function addProductSupplierRow() {
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

    row.querySelector('.remove-row').addEventListener('click', () => row.remove());
    productSupplierList.appendChild(row);
}

function readProductSuppliers() {
    return Array.from(productSupplierList.children).map((row) => ({
        supplierId: row.querySelector('.ps-supplier').value,
        packagePrice: row.querySelector('.ps-price').value || null,
        isMain: row.querySelector('.ps-main').checked
    }));
}

async function createProduct(event) {
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

    try {
        const result = await apiCreateProduct({
            productName: nameInput.value,
            unit: productForm.querySelector('input[name="unit"]:checked').value,
            packageQuantity: packageInput.value,
            minStock: document.getElementById('minStock').value || null,
            isPerishable: document.getElementById('isPerishable').checked,
            isResidual: document.getElementById('isResidual').checked,
            suppliers: readProductSuppliers()
        });
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

function formatQuantity(value, unit) {
    return `${QUANTITY.format(Number(value))} ${UNIT_LABELS[unit]}`;
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
