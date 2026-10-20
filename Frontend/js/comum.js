// comum.js: funções usadas por todas as páginas.
// Confirma a sessão junto do servidor, mostra o cabeçalho da marca,
// aplica na página as permissões de cada perfil (RBAC) e ajuda nos formulários.
// Os dados e as palavras-passe já não ficam no navegador: estão no servidor (ver api.js).

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

// ---------- Perfis e permissões ----------

function hasRole(userRole, requiredRole) {
    return ROLES[userRole].level >= ROLES[requiredRole].level;
}

function getRoleClass(role) {
    return `role-${role.toLowerCase()}`;
}

// Início de cada página privada: pergunta ao servidor quem tem a sessão aberta.
// Devolve { session, brand }, ou null quando a pessoa tem de sair da página.
// As permissões verdadeiras são confirmadas pelo servidor em cada pedido.
async function startPrivatePage(requiredRole) {
    let session;

    try {
        const result = await apiGetCurrentUser();
        session = result.user;
    } catch (error) {
        // Sem sessão (ou sessão terminada por inatividade): volta ao login
        window.location.href = 'login.html';
        return null;
    }

    if (requiredRole && !hasRole(session.role, requiredRole)) {
        window.location.href = 'marca.html';
        return null;
    }

    // O logótipo ainda não é guardado no servidor: por agora mostram-se as iniciais
    const brand = { name: session.brandName, logo: '' };

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

    document.getElementById('logoutButton').addEventListener('click', async () => {
        try {
            await apiLogout();
        } finally {
            window.location.href = 'login.html';
        }
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
