// api.js: o único ficheiro do frontend que fala com o servidor.
// As páginas chamam estas funções e não usam o localStorage para guardar dados.

// Envia um pedido à API e devolve a resposta.
// Se o servidor responder com erro, lança um erro com a mensagem que o servidor enviou.
async function apiRequest(method, url, data) {
    const options = { method, headers: {} };

    if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    let response;

    try {
        response = await fetch(url, options);
    } catch (error) {
        throw createApiError('Não foi possível ligar ao servidor. Confirma que está ligado.', 0);
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw createApiError(result.error || 'Ocorreu um erro. Tenta novamente.', response.status);
    }

    return result;
}

// Erro com a mensagem do servidor e o código da resposta (ex.: 401, 403)
function createApiError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

// ---------- Acesso ----------

function apiRegisterBrand(brandName, users) {
    return apiRequest('POST', '/api/auth/register', { brandName, users });
}

function apiLogin(email, password) {
    return apiRequest('POST', '/api/auth/login', { email, password });
}

function apiLogout() {
    return apiRequest('POST', '/api/auth/logout');
}

function apiGetCurrentUser() {
    return apiRequest('GET', '/api/auth/me');
}

// ---------- Utilizadores (só Administrador) ----------

function apiListUsers() {
    return apiRequest('GET', '/api/users');
}

function apiCreateUser(email, password, role) {
    return apiRequest('POST', '/api/users', { email, password, role });
}

function apiRemoveUser(userId) {
    return apiRequest('DELETE', `/api/users/${userId}`);
}

// ---------- Eventos ----------

function apiListEvents() {
    return apiRequest('GET', '/api/events');
}

function apiCreateEvent(eventData) {
    return apiRequest('POST', '/api/events', eventData);
}

function apiListDays(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/days`);
}

// ---------- Vendas (todos os perfis) ----------

function apiListSales(eventId, dayId) {
    return apiRequest('GET', `/api/events/${eventId}/sales?day=${dayId}`);
}

function apiCreateSales(eventId, eventDayId, lines) {
    return apiRequest('POST', `/api/events/${eventId}/sales`, { eventDayId, lines });
}

function apiCancelSale(eventId, saleId) {
    return apiRequest('POST', `/api/events/${eventId}/sales/${saleId}/cancel`);
}

// ---------- Ementa de um evento (consultar: todos; alterar: Gestor e Administrador) ----------

function apiGetMenu(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/menu`);
}

function apiCreateMenuItem(eventId, itemData) {
    return apiRequest('POST', `/api/events/${eventId}/menu`, itemData);
}

function apiUpdateMenuItem(eventId, itemId, itemData) {
    return apiRequest('PUT', `/api/events/${eventId}/menu/${itemId}`, itemData);
}

function apiDeleteMenuItem(eventId, itemId) {
    return apiRequest('DELETE', `/api/events/${eventId}/menu/${itemId}`);
}

function apiCopyMenu(eventId, fromEventId) {
    return apiRequest('POST', `/api/events/${eventId}/menu/copy`, { fromEventId });
}

// ---------- Compras de um evento (só Gestor e Administrador) ----------

function apiListPurchases(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/purchases`);
}

function apiCreatePurchase(eventId, purchaseData) {
    return apiRequest('POST', `/api/events/${eventId}/purchases`, purchaseData);
}

function apiDeletePurchase(eventId, purchaseId) {
    return apiRequest('DELETE', `/api/events/${eventId}/purchases/${purchaseId}`);
}

// ---------- Fornecedores e produtos (só Gestor e Administrador) ----------

function apiListSuppliers() {
    return apiRequest('GET', '/api/suppliers');
}

function apiCreateSupplier(supplierData) {
    return apiRequest('POST', '/api/suppliers', supplierData);
}

function apiUpdateSupplier(supplierId, supplierData) {
    return apiRequest('PUT', `/api/suppliers/${supplierId}`, supplierData);
}

function apiListProducts() {
    return apiRequest('GET', '/api/products');
}

function apiCreateProduct(productData) {
    return apiRequest('POST', '/api/products', productData);
}

function apiUpdateProduct(productId, productData) {
    return apiRequest('PUT', `/api/products/${productId}`, productData);
}

function apiListPrices(productId) {
    return apiRequest('GET', `/api/products/${productId}/prices`);
}

function apiAddPrice(productId, supplierId, packagePrice) {
    return apiRequest('POST', `/api/products/${productId}/prices`, { supplierId, packagePrice });
}