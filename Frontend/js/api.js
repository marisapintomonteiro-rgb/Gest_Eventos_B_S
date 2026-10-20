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