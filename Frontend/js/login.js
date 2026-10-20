// login.js: página "Entrar" (UC01 Iniciar sessão).
// Envia o email e a palavra-passe ao servidor, que os confirma e abre a sessão.

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formMessage = document.getElementById('formMessage');

setupPasswordToggles();
clearErrorsWhileTyping(loginForm);
showMessageFromAddress();

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(loginForm);
    hideMessage(formMessage);

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;

    if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Indica um email válido.');
        return;
    }

    if (password.length === 0) {
        showFieldError(passwordInput, 'Indica a palavra-passe.');
        return;
    }

    // O servidor confirma a palavra-passe e, se estiver certa, abre a sessão
    try {
        await apiLogin(email, password);
        window.location.href = 'marca.html';
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
        passwordInput.value = '';
        passwordInput.focus();
    }
});

// Mensagens que chegam no endereço da página (depois do registo ou do fim da sessão)
function showMessageFromAddress() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('registo') === 'ok') {
        emailInput.value = params.get('email') || '';
        showMessage(formMessage, 'Marca registada. Já podes entrar com um dos emails que definiste.', 'is-success');
    }

    if (params.get('sessao') === 'expirada') {
        showMessage(formMessage, 'A sessão terminou por inatividade. Entra novamente.', 'is-info');
    }
}