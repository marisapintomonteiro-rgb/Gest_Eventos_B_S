// conta.js: página "A minha conta". Cada pessoa muda a sua palavra-passe.
// Se o Administrador a repôs (palavra-passe temporária), esta página é obrigatória antes de continuar.

const passwordForm = document.getElementById('passwordForm');
const formMessage = document.getElementById('formMessage');
const pageMessage = document.getElementById('pageMessage');

let isTemporary = false;

startAccountPage();

async function startAccountPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    isTemporary = Boolean(page.session.mustChangePassword);
    document.getElementById('accountInfo').textContent = `${page.session.email} · ${page.session.role} da ${page.brand.name}`;
    document.getElementById('temporaryNote').hidden = !isTemporary;

    if (isTemporary) {
        document.getElementById('currentPasswordLabel').textContent = 'Palavra-passe temporária';
    }

    setupPasswordToggles();
    clearErrorsWhileTyping(passwordForm);
    passwordForm.addEventListener('submit', changePassword);
}

async function changePassword(event) {
    event.preventDefault();
    clearFormErrors(passwordForm);
    hideMessage(formMessage);

    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');

    if (currentInput.value === '') {
        showFieldError(currentInput, 'Escreve a palavra-passe atual.');
        return;
    }

    if (newInput.value.length < 8) {
        showFieldError(newInput, 'A palavra-passe nova tem de ter pelo menos 8 caracteres.');
        return;
    }

    if (confirmInput.value !== newInput.value) {
        showFieldError(confirmInput, 'As duas palavras-passe não são iguais.');
        return;
    }

    try {
        const result = await apiChangePassword(currentInput.value, newInput.value);
        passwordForm.reset();

        // Depois de trocar a palavra-passe temporária, segue para o Início
        if (isTemporary) {
            window.location.href = 'marca.html';
            return;
        }

        showMessage(pageMessage, result.message, 'is-success');
    } catch (error) {
        // A mensagem vem do servidor, ex.: "A palavra-passe atual não está certa."
        showMessage(formMessage, error.message, 'is-error');
    }
}
