// login.js: página "Entrar" (UC01 Iniciar sessão).
// Confirma o email e a palavra-passe e abre a página da marca.

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

    // Calcula o hash da palavra-passe escrita e compara com o hash guardado
    const account = findAccountByEmail(email);
    const passwordHash = account ? await hashPassword(password, account.passwordSalt) : '';

    // A mesma mensagem nos dois casos, para não revelar que emails existem
    if (!account || passwordHash !== account.passwordHash) {
        showMessage(formMessage, 'Email ou palavra-passe incorretos.', 'is-error');
        passwordInput.value = '';
        passwordInput.focus();
        return;
    }

    startSession(account);
    window.location.href = 'marca.html';
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
