// comum.js: funções usadas por todas as páginas.
// Guarda os dados no navegador, protege as palavras-passe com hash,
// controla a sessão e aplica as permissões de cada perfil (RBAC).

// Nomes usados para guardar os dados no navegador
const STORAGE_KEYS = {
    brands: 'gestEventosBrands',
    accounts: 'gestEventosAccounts',
    session: 'gestEventosSession'
};

// A sessão termina ao fim de 30 minutos sem atividade (RNF08)
const SESSION_TIMEOUT_MINUTES = 30;

// Perfis da aplicação. Um nível mais alto inclui as permissões dos níveis abaixo.
const ROLES = {
    Administrador: {
        level: 3,
        description: 'Tens acesso total, incluindo a gestão dos utilizadores da marca.'
    },
    Gestor: {
        level: 2,
        description: 'Geres eventos, ementas, produtos, fornecedores, compras, stock e resultados.'
    },
    Colaborador: {
        level: 1,
        description: 'Registas vendas e consumo interno durante o evento. Não vês custos nem lucro.'
    }
};

// ---------- Dados guardados no navegador ----------

function loadList(storageKey) {
    try {
        const storedValue = localStorage.getItem(storageKey);
        return storedValue ? JSON.parse(storedValue) : [];
    } catch (error) {
        console.error('Não foi possível ler os dados guardados.', error);
        return [];
    }
}

function saveList(storageKey, list) {
    localStorage.setItem(storageKey, JSON.stringify(list));
}

function findBrandById(brandId) {
    return loadList(STORAGE_KEYS.brands).find((brand) => brand.id === brandId);
}

function findAccountByEmail(email) {
    return loadList(STORAGE_KEYS.accounts).find((account) => account.email === email);
}

function createId() {
    return crypto.randomUUID();
}

// ---------- Palavras-passe ----------

// O "sal" é um valor aleatório: duas palavras-passe iguais ficam com hashes diferentes
function createSalt() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return bytesToHex(randomBytes);
}

// Calcula o hash SHA-256 do sal + palavra-passe. A palavra-passe nunca é guardada.
async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(hashBuffer));
}

function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---------- Sessão ----------

function startSession(account) {
    const now = Date.now();

    saveSession({
        accountId: account.id,
        brandId: account.brandId,
        email: account.email,
        role: account.role,
        startedAt: now,
        lastActivity: now
    });
}

function saveSession(session) {
    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function readSession() {
    const storedSession = sessionStorage.getItem(STORAGE_KEYS.session);
    return storedSession ? JSON.parse(storedSession) : null;
}

function endSession() {
    sessionStorage.removeItem(STORAGE_KEYS.session);
}

function isSessionExpired(session) {
    const minutesWithoutActivity = (Date.now() - session.lastActivity) / 60000;
    return minutesWithoutActivity > SESSION_TIMEOUT_MINUTES;
}

// Termina a sessão e volta ao login com o aviso de inatividade
function expireSession() {
    endSession();
    window.location.href = 'login.html?sessao=expirada';
}

function checkSession() {
    const session = readSession();

    if (session && isSessionExpired(session)) {
        expireSession();
    }
}

function registerActivity() {
    const session = readSession();

    // Sem sessão: a pessoa acabou de carregar em "Sair"
    if (!session) {
        return;
    }

    if (isSessionExpired(session)) {
        expireSession();
        return;
    }

    session.lastActivity = Date.now();
    saveSession(session);
}

// Conta cada clique ou tecla como atividade e confirma a sessão a cada minuto
function watchInactivity() {
    document.addEventListener('click', registerActivity);
    document.addEventListener('keydown', registerActivity);
    setInterval(checkSession, 60000);
}

// ---------- Perfis e permissões ----------

function hasRole(userRole, requiredRole) {
    return ROLES[userRole].level >= ROLES[requiredRole].level;
}

function getRoleClass(role) {
    return `role-${role.toLowerCase()}`;
}

// Início de cada página privada: confirma a sessão, o perfil e a marca.
// Devolve { session, brand } ou null quando a pessoa tem de sair da página.
function startPrivatePage(requiredRole) {
    const session = readSession();

    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    if (isSessionExpired(session)) {
        expireSession();
        return null;
    }

    const brand = findBrandById(session.brandId);

    if (!brand) {
        endSession();
        window.location.href = 'login.html';
        return null;
    }

    if (requiredRole && !hasRole(session.role, requiredRole)) {
        window.location.href = 'marca.html';
        return null;
    }

    registerActivity();
    watchInactivity();
    renderAppHeader(brand, session);
    return { session, brand };
}

// ---------- Cabeçalho da marca ----------

function renderAppHeader(brand, session) {
    document.title = `${brand.name} | Gestão de Eventos`;
    showBrandLogo(document.getElementById('headerLogo'), brand);
    document.getElementById('headerBrandName').textContent = brand.name;

    const roleChip = document.getElementById('headerRole');
    roleChip.textContent = session.role;
    roleChip.className = `role-chip ${getRoleClass(session.role)}`;
    document.getElementById('headerEmail').textContent = session.email;

    // Esconde as ligações que este perfil não pode usar
    document.querySelectorAll('[data-required-role]').forEach((element) => {
        element.hidden = !hasRole(session.role, element.dataset.requiredRole);
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        endSession();
        window.location.href = 'login.html';
    });
}

// Mostra o logótipo da marca. Sem logótipo, mostra as iniciais do nome.
function showBrandLogo(container, brand) {
    container.replaceChildren();

    if (brand.logo) {
        const image = document.createElement('img');
        image.src = brand.logo;
        image.alt = `Logótipo ${brand.name}`;
        container.appendChild(image);
        return;
    }

    const monogram = document.createElement('span');
    monogram.className = 'monogram';
    monogram.textContent = getInitials(brand.name);
    container.appendChild(monogram);
}

function getInitials(name) {
    const words = name.split(' ').filter((word) => word.length > 2);
    const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [name[0]];
    return letters.join('').toUpperCase();
}

// ---------- Formulários ----------

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// O erro aparece no elemento com o id do campo + "Error" (ex.: emailError)
function showFieldError(input, message) {
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    document.getElementById(`${input.id}Error`).textContent = message;
}

function clearFieldError(input) {
    const errorElement = document.getElementById(`${input.id}Error`);
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');

    if (errorElement) {
        errorElement.textContent = '';
    }
}

function clearFormErrors(form) {
    form.querySelectorAll('input, select').forEach(clearFieldError);
}

// O erro de um campo desaparece assim que a pessoa o corrige
function clearErrorsWhileTyping(form) {
    form.addEventListener('input', (event) => clearFieldError(event.target));
}

// type pode ser 'is-error', 'is-success' ou 'is-info'
function showMessage(messageElement, text, type) {
    messageElement.textContent = text;
    messageElement.className = `form-message ${type}`;
    messageElement.hidden = false;
}

function hideMessage(messageElement) {
    messageElement.hidden = true;
}

// Botões "Mostrar"/"Ocultar" ao lado das palavras-passe
function setupPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
        const input = document.getElementById(button.dataset.togglePassword);

        button.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            button.textContent = isHidden ? 'Ocultar' : 'Mostrar';
            button.setAttribute('aria-pressed', String(isHidden));
        });
    });
}
