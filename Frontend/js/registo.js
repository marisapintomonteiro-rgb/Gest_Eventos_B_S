// registo.js: página "Registar marca" (UC03 Criar conta).
// A marca escolhe as funções que vai usar e associa a cada uma um email e uma palavra-passe.
// Os dados são enviados ao servidor, que os confirma e grava no MySQL.

const MAX_LOGO_SIZE = 1024 * 1024; // 1 MB

const brandForm = document.getElementById('brandForm');
const brandNameInput = document.getElementById('brandName');
const logoInput = document.getElementById('brandLogo');
const formMessage = document.getElementById('formMessage');
const previewLogo = document.getElementById('previewLogo');
const previewName = document.getElementById('previewName');

// Uma entrada por função. O Administrador não tem caixa porque é obrigatório.
const roleBlocks = [
    {
        role: 'Administrador',
        checkbox: null,
        emailInput: document.getElementById('adminEmail'),
        passwordInput: document.getElementById('adminPassword')
    },
    {
        role: 'Gestor',
        checkbox: document.getElementById('useGestor'),
        emailInput: document.getElementById('gestorEmail'),
        passwordInput: document.getElementById('gestorPassword')
    },
    {
        role: 'Colaborador',
        checkbox: document.getElementById('useColaborador'),
        emailInput: document.getElementById('colaboradorEmail'),
        passwordInput: document.getElementById('colaboradorPassword')
    }
];

// Logótipo escolhido, convertido em texto (data URL) para poder ser guardado
let logoDataUrl = '';

setupPasswordToggles();
clearErrorsWhileTyping(brandForm);
renderPreview();

roleBlocks.forEach((block) => {
    if (block.checkbox) {
        block.checkbox.addEventListener('change', () => updateRoleBlock(block));
    }
});

brandNameInput.addEventListener('input', renderPreview);
logoInput.addEventListener('change', handleLogoChange);
brandForm.addEventListener('input', () => hideMessage(formMessage));

brandForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(brandForm);
    hideMessage(formMessage);

    const brandName = brandNameInput.value.trim();
    const activeBlocks = roleBlocks.filter((block) => !block.checkbox || block.checkbox.checked);

    if (!validateBrandForm(brandName, activeBlocks)) {
        showMessage(formMessage, 'Revê os campos assinalados a vermelho.', 'is-error');
        return;
    }

    // Uma conta por função escolhida. A palavra-passe vai para o servidor, que guarda só o hash (bcrypt).
    // O logótipo ainda não é enviado: falta decidir como o guardar no servidor.
    const users = activeBlocks.map((block) => ({
        role: block.role,
        email: normalizeEmail(block.emailInput.value),
        password: block.passwordInput.value
    }));

    try {
        await apiRegisterBrand(brandName, users);
    } catch (error) {
        showMessage(formMessage, error.message, 'is-error');
        return;
    }

    const adminEmail = users[0].email;
    window.location.href = `login.html?registo=ok&email=${encodeURIComponent(adminEmail)}`;
});

// Liga ou desliga os campos de uma função quando a caixa muda
function updateRoleBlock(block) {
    const isActive = block.checkbox.checked;
    block.emailInput.disabled = !isActive;
    block.passwordInput.disabled = !isActive;
    block.checkbox.closest('.credential').classList.toggle('is-off', !isActive);
}

// Verificações rápidas na página. As verificações que contam (nome ou emails já usados) são feitas pelo servidor.
function validateBrandForm(brandName, activeBlocks) {
    const formEmails = [];
    let isValid = true;

    if (brandName.length < 2) {
        showFieldError(brandNameInput, 'Indica o nome da marca.');
        isValid = false;
    }

    activeBlocks.forEach((block) => {
        const email = normalizeEmail(block.emailInput.value);

        if (!isValidEmail(email)) {
            showFieldError(block.emailInput, 'Indica um email válido.');
            isValid = false;
        } else if (formEmails.includes(email)) {
            showFieldError(block.emailInput, 'Usa um email diferente para cada função.');
            isValid = false;
        }

        formEmails.push(email);

        if (block.passwordInput.value.length < 8) {
            showFieldError(block.passwordInput, 'A palavra-passe tem de ter pelo menos 8 caracteres.');
            isValid = false;
        }
    });

    return isValid;
}

// Confirma o tipo e o tamanho do logótipo e lê-o para a pré-visualização
function handleLogoChange() {
    const file = logoInput.files[0];
    logoDataUrl = '';
    clearFieldError(logoInput);

    if (file && !file.type.startsWith('image/')) {
        showFieldError(logoInput, 'Escolhe um ficheiro de imagem (PNG, JPG ou SVG).');
        logoInput.value = '';
    } else if (file && file.size > MAX_LOGO_SIZE) {
        showFieldError(logoInput, 'O logótipo tem de ter até 1 MB.');
        logoInput.value = '';
    } else if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            logoDataUrl = reader.result;
            renderPreview();
        });
        reader.readAsDataURL(file);
    }

    renderPreview();
}

// Mostra como vai ficar o cartão de acesso da marca.
// Com logótipo, o nome não se repete por baixo.
function renderPreview() {
    const brandName = brandNameInput.value.trim();
    previewName.textContent = brandName || 'Nome da marca';
    previewName.hidden = Boolean(logoDataUrl);
    showBrandLogo(previewLogo, { name: brandName || '?', logo: logoDataUrl });
}
