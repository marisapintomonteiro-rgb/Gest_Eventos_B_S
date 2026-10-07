// marca.js: página da marca depois de entrar.
// Mostra o cartão de acesso e só as funcionalidades que o perfil pode usar.

// Áreas da aplicação (casos de uso) e o perfil mínimo para cada funcionalidade
const APP_AREAS = [
    {
        title: 'Planeamento do evento',
        features: [
            { name: 'Criar evento e configurar os dias', requiredRole: 'Gestor' },
            { name: 'Gerir produtos e ementa', requiredRole: 'Gestor' },
            { name: 'Gerir fornecedores', requiredRole: 'Gestor' },
            { name: 'Consultar previsão de compras', requiredRole: 'Gestor' }
        ]
    },
    {
        title: 'Operação diária',
        features: [
            { name: 'Consultar calendário e ementa', requiredRole: 'Colaborador' },
            { name: 'Registar vendas', requiredRole: 'Colaborador' },
            { name: 'Registar consumo interno', requiredRole: 'Colaborador' },
            { name: 'Consultar faturação do dia', requiredRole: 'Colaborador' },
            { name: 'Registar compras e corrigir stock', requiredRole: 'Gestor' },
            { name: 'Fechar e reabrir dias', requiredRole: 'Gestor' }
        ]
    },
    {
        title: 'Análise e encerramento',
        features: [
            { name: 'Gerir despesas e devoluções', requiredRole: 'Gestor' },
            { name: 'Consultar resultados e dashboard', requiredRole: 'Gestor' },
            { name: 'Encerrar evento e gerar relatório', requiredRole: 'Gestor' },
            { name: 'Consultar histórico de eventos', requiredRole: 'Gestor' }
        ]
    },
    {
        title: 'Administração',
        features: [
            { name: 'Gerir utilizadores', requiredRole: 'Administrador', link: 'utilizadores.html' }
        ]
    }
];

const page = startPrivatePage();

if (page) {
    renderBadge(page.brand, page.session);
    renderWelcome(page.session);
    renderAreas(page.session.role);
}

// Cartão de acesso: logótipo, perfil e email.
// O nome da marca só aparece por escrito quando não há logótipo.
function renderBadge(brand, session) {
    showBrandLogo(document.getElementById('badgeLogo'), brand);

    const badgeBrandName = document.getElementById('badgeBrandName');
    badgeBrandName.textContent = brand.name;
    badgeBrandName.hidden = Boolean(brand.logo);

    const badgeRole = document.getElementById('badgeRole');
    badgeRole.textContent = session.role;
    badgeRole.className = `badge-band ${getRoleClass(session.role)}`;

    document.getElementById('badgeEmail').textContent = session.email;
}

function renderWelcome(session) {
    const startTime = new Date(session.startedAt).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('welcomeTitle').textContent = `Olá! Entraste como ${session.role}.`;
    document.getElementById('welcomeRole').textContent = ROLES[session.role].description;
    document.getElementById('sessionInfo').textContent =
        `Sessão iniciada às ${startTime}. Termina ao fim de ${SESSION_TIMEOUT_MINUTES} minutos sem atividade.`;
}

// Cria uma coluna por área, só com as funcionalidades permitidas ao perfil
function renderAreas(role) {
    const areasContainer = document.getElementById('areas');
    areasContainer.replaceChildren();

    APP_AREAS.forEach((area) => {
        const allowedFeatures = area.features.filter((feature) => hasRole(role, feature.requiredRole));

        if (allowedFeatures.length === 0) {
            return;
        }

        const section = document.createElement('section');
        section.className = 'area';

        const title = document.createElement('h3');
        title.textContent = area.title;

        const list = document.createElement('ul');
        list.className = 'feature-list';
        allowedFeatures.forEach((feature) => list.appendChild(createFeatureItem(feature)));

        section.append(title, list);
        areasContainer.appendChild(section);
    });
}

// Funcionalidade pronta: botão "Abrir". Ainda por fazer: etiqueta "Em breve".
function createFeatureItem(feature) {
    const item = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = feature.name;
    item.appendChild(name);

    if (feature.link) {
        const link = document.createElement('a');
        link.className = 'button button-small';
        link.href = feature.link;
        link.textContent = 'Abrir';
        item.appendChild(link);
    } else {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = 'Em breve';
        item.appendChild(tag);
    }

    return item;
}
