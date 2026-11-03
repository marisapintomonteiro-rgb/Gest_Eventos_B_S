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

// Mudar a própria palavra-passe (todos os perfis)
function apiChangePassword(currentPassword, newPassword) {
    return apiRequest('PUT', '/api/auth/password', { currentPassword, newPassword });
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

// O Administrador repõe a palavra-passe de uma conta (fica temporária)
function apiResetPassword(userId, password) {
    return apiRequest('POST', `/api/users/${userId}/password`, { password });
}

function apiRemoveUser(userId) {
    return apiRequest('DELETE', `/api/users/${userId}`);
}

// ---------- Eventos ----------

function apiListEvents() {
    return apiRequest('GET', '/api/events');
}

function apiGetEvent(eventId) {
    return apiRequest('GET', `/api/events/${eventId}`);
}

function apiUpdateEvent(eventId, eventData) {
    return apiRequest('PUT', `/api/events/${eventId}`, eventData);
}

function apiCreateEvent(eventData) {
    return apiRequest('POST', '/api/events', eventData);
}

function apiListDays(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/days`);
}

// Fechar e reabrir um dia (Gestor e Administrador)
function apiCloseDay(eventId, dayId) {
    return apiRequest('POST', `/api/events/${eventId}/days/${dayId}/close`);
}

function apiReopenDay(eventId, dayId) {
    return apiRequest('POST', `/api/events/${eventId}/days/${dayId}/reopen`);
}

// ---------- Notas (ler: todos; escrever: Gestor e Administrador) ----------

function apiListNotes(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/notes`);
}

function apiCreateNote(eventId, noteData) {
    return apiRequest('POST', `/api/events/${eventId}/notes`, noteData);
}

function apiDeleteNote(eventId, noteId) {
    return apiRequest('DELETE', `/api/events/${eventId}/notes/${noteId}`);
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

// ---------- Stock (consultar e consumo interno: todos; o resto: Gestor e Administrador) ----------

function apiGetStock(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/stock`);
}

function apiCreateStockMovement(eventId, movementData) {
    return apiRequest('POST', `/api/events/${eventId}/stock/movements`, movementData);
}

function apiCreateStockCorrection(eventId, correctionData) {
    return apiRequest('POST', `/api/events/${eventId}/stock/corrections`, correctionData);
}

// ---------- Painel e despesas ----------

function apiGetDashboard(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/dashboard`);
}

function apiListExpenses(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/expenses`);
}

function apiCreateExpense(eventId, expenseData) {
    return apiRequest('POST', `/api/events/${eventId}/expenses`, expenseData);
}

function apiDeleteExpense(eventId, expenseId) {
    return apiRequest('DELETE', `/api/events/${eventId}/expenses/${expenseId}`);
}

// ---------- Devoluções, encerramento e relatório (Gestor e Administrador) ----------

function apiListReturns(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/returns`);
}

function apiCreateReturn(eventId, returnData) {
    return apiRequest('POST', `/api/events/${eventId}/returns`, returnData);
}

function apiDeleteReturn(eventId, returnId) {
    return apiRequest('DELETE', `/api/events/${eventId}/returns/${returnId}`);
}

function apiGetReport(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/report`);
}

function apiCloseEvent(eventId) {
    return apiRequest('POST', `/api/events/${eventId}/close`);
}

// ---------- Previsão de compras e calendário ----------

function apiGetForecast(eventId, margin) {
    return apiRequest('GET', `/api/events/${eventId}/forecast?margin=${encodeURIComponent(margin)}`);
}

function apiSetPreviousEvent(eventId, previousEventId) {
    return apiRequest('PUT', `/api/events/${eventId}/previous`, { previousEventId });
}

function apiGetCalendar() {
    return apiRequest('GET', '/api/events/calendar');
}

// ---------- Faturas e faturação do dia em euros (eventos sem controlo de stock) ----------

function apiListInvoices(eventId) {
    return apiRequest('GET', `/api/events/${eventId}/invoices`);
}

function apiCreateInvoice(eventId, invoiceData) {
    return apiRequest('POST', `/api/events/${eventId}/invoices`, invoiceData);
}

function apiDeleteInvoice(eventId, invoiceId) {
    return apiRequest('DELETE', `/api/events/${eventId}/invoices/${invoiceId}`);
}

function apiCreateDayTotal(eventId, eventDayId, amount, note) {
    return apiRequest('POST', `/api/events/${eventId}/sales/totals`, { eventDayId, amount, note });
}

function apiDeleteDayTotal(eventId, revenueId) {
    return apiRequest('DELETE', `/api/events/${eventId}/sales/totals/${revenueId}`);
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