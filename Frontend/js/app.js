const STORAGE_KEY = 'bebeESigaUsers';

const form = document.getElementById('userForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const roleInput = document.getElementById('role');
const tableBody = document.getElementById('userTableBody');
const tableWrapper = document.getElementById('tableWrapper');
const emptyState = document.getElementById('emptyState');
const userCount = document.getElementById('userCount');

let users = loadUsers();
renderUsers();

form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const role = roleInput.value;

    if (!validateForm(name, email, role)) {
        return;
    }

    const emailAlreadyExists = users.some((user) => user.email === email);

    if (emailAlreadyExists) {
        showError(emailInput, 'emailError', 'Já existe um utilizador com este email.');
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        email,
        role
    };

    users.push(newUser);
    saveUsers();
    renderUsers();
    form.reset();
    nameInput.focus();
});

function validateForm(name, email, role) {
    let isValid = true;

    if (name.length < 3) {
        showError(nameInput, 'nameError', 'Indica o nome completo.');
        isValid = false;
    }

    if (!isValidEmail(email)) {
        showError(emailInput, 'emailError', 'Indica um email válido.');
        isValid = false;
    }

    if (!role) {
        showError(roleInput, 'roleError', 'Seleciona um perfil.');
        isValid = false;
    }

    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(input, errorId, message) {
    input.classList.add('invalid');
    document.getElementById(errorId).textContent = message;
}

function clearErrors() {
    [nameInput, emailInput, roleInput].forEach((input) => input.classList.remove('invalid'));
    ['nameError', 'emailError', 'roleError'].forEach((id) => {
        document.getElementById(id).textContent = '';
    });
}

function renderUsers() {
    tableBody.innerHTML = '';
    userCount.textContent = users.length;

    if (users.length === 0) {
        emptyState.hidden = false;
        tableWrapper.hidden = true;
        return;
    }

    emptyState.hidden = true;
    tableWrapper.hidden = false;

    users.forEach((user) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.className = 'user-name';
        nameCell.textContent = user.name;

        const emailCell = document.createElement('td');
        emailCell.textContent = user.email;

        const roleCell = document.createElement('td');
        const roleBadge = document.createElement('span');
        roleBadge.className = `role-badge ${user.role === 'Administrador' ? 'admin' : ''}`;
        roleBadge.textContent = user.role;
        roleCell.appendChild(roleBadge);

        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Eliminar';
        deleteButton.setAttribute('aria-label', `Eliminar ${user.name}`);
        deleteButton.addEventListener('click', () => deleteUser(user.id));
        actionCell.appendChild(deleteButton);

        row.append(nameCell, emailCell, roleCell, actionCell);
        tableBody.appendChild(row);
    });
}

function deleteUser(userId) {
    const user = users.find((item) => item.id === userId);

    if (!user) {
        return;
    }

    const confirmed = window.confirm(`Eliminar o utilizador ${user.name}?`);

    if (!confirmed) {
        return;
    }

    users = users.filter((item) => item.id !== userId);
    saveUsers();
    renderUsers();
}

function loadUsers() {
    try {
        const storedUsers = localStorage.getItem(STORAGE_KEY);
        return storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
        console.error('Não foi possível carregar os utilizadores.', error);
        return [];
    }
}

function saveUsers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
