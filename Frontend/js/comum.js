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

    // Com uma palavra-passe temporária, a pessoa tem de escolher outra antes de usar a aplicação
    if (session.mustChangePassword && !window.location.pathname.endsWith('conta.html')) {
        window.location.href = 'conta.html';
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

    // Atalho para "A minha conta" (mudar a palavra-passe), ao lado do botão Sair
    const logoutButton = document.getElementById('logoutButton');
    if (!document.getElementById('accountLink')) {
        const accountLink = createElementWithText('a', 'button button-ghost button-small', 'Conta');
        accountLink.id = 'accountLink';
        accountLink.href = 'conta.html';
        logoutButton.before(accountLink);
    }

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

// ---------- Formatação de valores (usada em várias páginas) ----------

const MONEY = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const QUANTITY = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const UNIT_LABELS = { unidade: 'un.', mililitro: 'ml', grama: 'g' };

// Mostra uma quantidade guardada na unidade base; a partir de 1000 ml ou 1000 g mostra também
// em L ou kg (ex.: "30 L (30 000 ml)")
function formatQuantity(value, unit) {
    const amount = Number(value);
    const base = `${QUANTITY.format(amount)} ${UNIT_LABELS[unit]}`;

    if (unit !== 'unidade' && amount >= 1000) {
        const bigLabel = unit === 'mililitro' ? 'L' : 'kg';
        return `${QUANTITY.format(amount / 1000)} ${bigLabel} (${base})`;
    }

    return base;
}

function createElementWithText(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    return element;
}

// ---------- Escolher o evento (páginas Ementa e Compras) ----------

// Texto de cada evento na lista: nome e primeiro dia
function formatEventOption(event) {
    if (!event.first_day) {
        return event.event_name;
    }

    return `${event.event_name} (${new Date(`${event.first_day}T12:00:00`).toLocaleDateString('pt-PT')})`;
}

// Preenche a lista de eventos (#eventSelect) e devolve o evento escolhido.
// O evento pode vir no endereço (ex.: ementa.html?event=3); senão, fica o primeiro da lista.
// onChange é chamada com o número do evento sempre que se escolhe outro.
function setupEventPicker(events, pageFile, onChange) {
    const select = document.getElementById('eventSelect');

    events.forEach((event) => {
        const option = document.createElement('option');
        option.value = event.event_id;
        option.textContent = formatEventOption(event);
        select.appendChild(option);
    });

    const fromAddress = new URLSearchParams(window.location.search).get('event');
    const exists = events.some((event) => String(event.event_id) === fromAddress);
    const eventId = exists ? Number(fromAddress) : events[0].event_id;
    select.value = eventId;

    document.getElementById('eventPicker').hidden = false;
    showReadOnlyNote(events, eventId);
    select.addEventListener('change', () => {
        const chosenId = Number(select.value);
        history.replaceState(null, '', `${pageFile}?event=${chosenId}`);
        showReadOnlyNote(events, chosenId);
        onChange(chosenId);
    });

    return eventId;
}

// Aviso por baixo da lista de eventos quando o prazo de edição já terminou (RF26)
function showReadOnlyNote(events, eventId) {
    const event = events.find((item) => item.event_id === eventId);
    let note = document.getElementById('readOnlyNote');

    if (!note) {
        note = createElementWithText('p', 'readonly-note', '');
        note.id = 'readOnlyNote';
        document.getElementById('eventPicker').after(note);
    }

    note.hidden = !event || event.is_editable !== false;

    if (event && event.edit_deadline) {
        const deadline = event.edit_deadline.split('-').reverse().join('/');
        note.textContent = `Só consulta: o prazo de edição deste evento terminou a ${deadline} (um mês depois do último dia).`;
    }
}

// O evento controla o stock? (por defeito sim; os eventos "só com valores" têm track_stock = 0)
function eventTracksStock(event) {
    if (!event || event.track_stock === undefined || event.track_stock === null) {
        return true;
    }

    return Boolean(Number(event.track_stock));
}
