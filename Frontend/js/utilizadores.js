// utilizadores.js: gestão dos utilizadores da marca (UC02, só para o Administrador).
// Acrescenta contas com email, palavra-passe e perfil, e remove acessos, através do servidor.

let page = null;

const userForm = document.getElementById('userForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('role');
const pageMessage = document.getElementById('pageMessage');
const tableBody = document.getElementById('userTableBody');
const userCount = document.getElementById('userCount');

startUsersPage();

// Confirma com o servidor que quem entrou é Administrador e só depois mostra a página
async function startUsersPage() {
    page = await startPrivatePage('Administrador');

    if (!page) {
        return;
    }

    document.getElementById('teamIntro').textContent =
        `Cria e remove os acessos da equipa da ${page.brand.name}. Cada pessoa entra com o seu email e a sua palavra-passe.`;

    setupPasswordToggles();
    clearErrorsWhileTyping(userForm);
    userForm.addEventListener('submit', addUser);
    await renderUsers();
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

    // O servidor confirma os dados, protege a palavra-passe com bcrypt e grava a conta
    try {
        const result = await apiCreateUser(email, password, role);
        userForm.reset();
        await renderUsers();
        showMessage(pageMessage, result.message, 'is-success');
        emailInput.focus();
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}

function validateUserForm(email, password, role) {
    let isValid = true;

    // Se o email já existir noutra conta, quem avisa é o servidor
    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Indica um email válido.');
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

// Pede ao servidor a lista das contas desta marca e desenha a tabela
async function renderUsers() {
    let brandAccounts;

    try {
        const result = await apiListUsers();
        brandAccounts = result.users;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    tableBody.replaceChildren();
    userCount.textContent = brandAccounts.length;

    brandAccounts.forEach((account) => {
        const isCurrentUser = account.user_id === page.session.userId;
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
        dateCell.textContent = new Date(account.created_at).toLocaleDateString('pt-PT');

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

async function removeUser(account) {
    const confirmed = window.confirm(`Remover o acesso de ${account.email}?`);

    if (!confirmed) {
        return;
    }

    try {
        await apiRemoveUser(account.user_id);
        await renderUsers();
        showMessage(pageMessage, `O acesso de ${account.email} foi removido.`, 'is-success');
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
    }
}
