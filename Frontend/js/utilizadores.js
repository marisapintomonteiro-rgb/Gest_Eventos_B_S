// utilizadores.js: gestão dos utilizadores da marca (UC02, só para o Administrador).
// Acrescenta contas com email, palavra-passe e perfil, e remove acessos.

const page = startPrivatePage('Administrador');

const userForm = document.getElementById('userForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('role');
const pageMessage = document.getElementById('pageMessage');
const tableBody = document.getElementById('userTableBody');
const userCount = document.getElementById('userCount');

if (page) {
    document.getElementById('teamIntro').textContent =
        `Cria e remove os acessos da equipa da ${page.brand.name}. Cada pessoa entra com o seu email e a sua palavra-passe.`;

    setupPasswordToggles();
    clearErrorsWhileTyping(userForm);
    renderUsers();
    userForm.addEventListener('submit', addUser);
}

async function addUser(event) {
    event.preventDefault();
    clearFormErrors(userForm);
    hideMessage(pageMessage);

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const role = roleInput.value;

    if (!validateUserForm(email, password, role)) {
        return;
    }

    const salt = createSalt();
    const newAccount = {
        id: createId(),
        brandId: page.brand.id,
        role,
        email,
        passwordSalt: salt,
        passwordHash: await hashPassword(password, salt),
        createdAt: new Date().toISOString()
    };

    saveList(STORAGE_KEYS.accounts, [...loadList(STORAGE_KEYS.accounts), newAccount]);
    userForm.reset();
    renderUsers();
    showMessage(pageMessage, `${email} já pode entrar como ${role}.`, 'is-success');
    emailInput.focus();
}

function validateUserForm(email, password, role) {
    let isValid = true;

    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Indica um email válido.');
        isValid = false;
    } else if (findAccountByEmail(email)) {
        showFieldError(emailInput, 'Este email já está associado a uma conta.');
        isValid = false;
    }

    if (password.length < 8) {
        showFieldError(passwordInput, 'A palavra-passe tem de ter pelo menos 8 caracteres.');
        isValid = false;
    }

    if (!role) {
        showFieldError(roleInput, 'Escolhe o perfil.');
        isValid = false;
    }

    return isValid;
}

// Só as contas desta marca
function getBrandAccounts() {
    return loadList(STORAGE_KEYS.accounts).filter((account) => account.brandId === page.brand.id);
}

function renderUsers() {
    const brandAccounts = getBrandAccounts();
    tableBody.replaceChildren();
    userCount.textContent = brandAccounts.length;

    brandAccounts.forEach((account) => {
        const isCurrentUser = account.id === page.session.accountId;
        const row = document.createElement('tr');

        const emailCell = document.createElement('td');
        emailCell.className = 'user-email-cell';
        emailCell.textContent = account.email;

        if (isCurrentUser) {
            const youTag = document.createElement('span');
            youTag.className = 'tag tag-you';
            youTag.textContent = 'Tu';
            emailCell.append(' ', youTag);
        }

        const roleCell = document.createElement('td');
        const roleChip = document.createElement('span');
        roleChip.className = `role-chip ${getRoleClass(account.role)}`;
        roleChip.textContent = account.role;
        roleCell.appendChild(roleChip);

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(account.createdAt).toLocaleDateString('pt-PT');

        // Ninguém remove o próprio acesso: assim a marca fica sempre com um Administrador
        const actionCell = document.createElement('td');

        if (!isCurrentUser) {
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'link-button';
            removeButton.textContent = 'Remover';
            removeButton.setAttribute('aria-label', `Remover ${account.email}`);
            removeButton.addEventListener('click', () => removeUser(account));
            actionCell.appendChild(removeButton);
        }

        row.append(emailCell, roleCell, dateCell, actionCell);
        tableBody.appendChild(row);
    });
}

function removeUser(account) {
    const confirmed = window.confirm(`Remover o acesso de ${account.email}?`);

    if (!confirmed) {
        return;
    }

    const remainingAccounts = loadList(STORAGE_KEYS.accounts).filter((item) => item.id !== account.id);
    saveList(STORAGE_KEYS.accounts, remainingAccounts);
    renderUsers();
    showMessage(pageMessage, `O acesso de ${account.email} foi removido.`, 'is-success');
}
