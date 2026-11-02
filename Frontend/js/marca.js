// marca.js: página Início ("Hoje"). Mostra o evento a decorrer (ou o próximo), os números do dia,
// atalhos para o que cada perfil faz mais vezes e a lista do que está por tratar.
// Os dados vêm das mesmas rotas das outras páginas; o servidor só envia o que o perfil pode ver.

const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const pageMessage = document.getElementById('pageMessage');

let session = null;

startHomePage();

async function startHomePage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    session = page.session;
    renderWelcome();

    let events;

    try {
        events = (await apiListEvents()).events;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    const choice = chooseEvent(events);

    if (!choice) {
        renderNoEvent(events.length > 0);
        return;
    }

    await renderEvent(choice);
}

function getToday() {
    return new Date().toLocaleDateString('sv-SE');
}

function renderWelcome() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Bom dia' : (hour < 20 ? 'Boa tarde' : 'Boa noite');

    document.getElementById('todayDate').textContent =
        `${WEEKDAYS_LONG[now.getDay()]}, ${now.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.getElementById('welcomeTitle').textContent = `${greeting}!`;
    document.getElementById('welcomeRole').textContent = `Entraste como ${session.role}. ${ROLES[session.role].description}`;
    document.getElementById('sessionInfo').textContent =
        `A sessão termina ao fim de ${SESSION_TIMEOUT_MINUTES} minutos sem atividade.`;
}

// O evento que interessa hoje: o que está a decorrer; senão, o próximo; senão, o último que houve
function chooseEvent(events) {
    const today = getToday();
    const withDays = events.filter((event) => event.first_day);

    const current = withDays.find((event) => event.first_day <= today && event.last_day >= today);

    if (current) {
        return { event: current, state: 'current' };
    }

    const upcoming = withDays
        .filter((event) => event.first_day > today)
        .sort((first, second) => first.first_day.localeCompare(second.first_day))[0];

    if (upcoming) {
        return { event: upcoming, state: 'upcoming' };
    }

    const past = withDays.sort((first, second) => second.last_day.localeCompare(first.last_day))[0];
    return past ? { event: past, state: 'past' } : null;
}

function renderNoEvent(hasOldEvents) {
    document.getElementById('noEventPanel').hidden = false;
    document.getElementById('noEventText').textContent = hasOldEvents
        ? 'Os eventos anteriores continuam disponíveis na página Eventos.'
        : 'Quando houver um evento planeado, aparece aqui o que há para fazer em cada dia.';
}

function daysBetween(fromDate, toDate) {
    const from = new Date(`${fromDate}T12:00:00`);
    const to = new Date(`${toDate}T12:00:00`);
    return Math.round((to - from) / 86400000);
}

function formatDate(text) {
    return new Date(`${text}T12:00:00`).toLocaleDateString('pt-PT');
}

// ---------- O evento ----------

async function renderEvent({ event, state }) {
    let days;
    let dashboard;

    try {
        [days, dashboard] = await Promise.all([
            apiListDays(event.event_id).then((result) => result.days),
            apiGetDashboard(event.event_id)
        ]);
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    const today = getToday();
    const todayDay = days.find((day) => day.event_date === today);

    renderEventCard(event, state, days, todayDay);
    renderFigures(dashboard, todayDay);
    renderActions(event, state, todayDay);
    renderTodo(event, state, days, dashboard, today);
    document.getElementById('todayGrid').hidden = false;
}

function renderEventCard(event, state, days, todayDay) {
    const today = getToday();
    document.getElementById('todayEvent').hidden = false;
    document.getElementById('todayEventName').textContent = event.event_name;
    document.getElementById('todayEventMeta').textContent = `${event.location} · ${formatDate(event.first_day)} a ${formatDate(event.last_day)}`;

    let label = '';
    let value = '';
    let unit = '';
    let status = '';

    if (state === 'current') {
        status = 'A decorrer';

        if (todayDay) {
            const position = days.indexOf(todayDay) + 1;
            label = 'Hoje é o dia';
            value = String(position);
            unit = `de ${days.length}`;
        } else {
            const next = days.find((day) => day.event_date > today);
            label = 'Hoje não há evento';
            value = next ? String(daysBetween(today, next.event_date)) : '—';
            unit = next ? 'dias para o próximo' : '';
        }
    } else if (state === 'upcoming') {
        const left = daysBetween(today, event.first_day);
        status = 'Próximo evento';
        label = 'Começa daqui a';
        value = String(left);
        unit = left === 1 ? 'dia' : 'dias';
    } else {
        status = event.is_closed ? 'Encerrado' : 'Terminou';
        label = 'Terminou há';
        value = String(daysBetween(event.last_day, today));
        unit = 'dias';
    }

    document.getElementById('todayStatus').textContent = status;
    document.getElementById('todayStubLabel').textContent = label;
    document.getElementById('todayStubValue').textContent = value;
    document.getElementById('todayStubUnit').textContent = unit;

    // Os dias do evento: hoje em destaque e os fechados marcados
    const dayList = document.getElementById('todayDays');
    dayList.replaceChildren();

    days.forEach((day) => {
        const date = new Date(`${day.event_date}T12:00:00`);
        let text = `${WEEKDAYS_LONG[date.getDay()].slice(0, 3)}. ${date.getDate()}`;

        if (day.is_closed) {
            text += ' · fechado';
        }

        const pill = createElementWithText('span', 'day-pill', text);

        if (day === todayDay) {
            pill.classList.add('is-today');
        }

        dayList.append(pill);
    });
}

// Faturação de hoje (com o objetivo), faturação do evento e, para quem gere, o resultado
function renderFigures(dashboard, todayDay) {
    const figures = document.getElementById('todayFigures');
    figures.replaceChildren();

    if (todayDay) {
        const day = dashboard.days.find((item) => item.eventDayId === todayDay.event_day_id);
        const hint = day && day.target ? `${Math.round((day.revenue / day.target) * 100)}% do objetivo de ${MONEY.format(day.target)}` : 'sem objetivo definido';
        figures.append(createHeroFigure('Faturação de hoje', MONEY.format(day ? day.revenue : 0), hint));
    }

    figures.append(createHeroFigure('Faturação do evento', MONEY.format(dashboard.revenue), `${dashboard.days.filter((day) => day.revenue > 0).length} de ${dashboard.days.length} dias com vendas`));

    if (dashboard.finance) {
        const result = dashboard.finance.result;
        const figure = createHeroFigure('Resultado estimado', MONEY.format(result), result >= 0 ? 'Lucro' : `Faltam ${MONEY.format(-result)} para cobrir os custos`);
        figure.classList.add(result >= 0 ? 'is-profit' : 'is-loss');
        figures.append(figure);
    }

    figures.hidden = false;
}

function createHeroFigure(label, value, hint) {
    const figure = document.createElement('div');
    figure.className = 'hero-figure';
    figure.append(
        createElementWithText('span', 'figure-label', label),
        createElementWithText('strong', 'hero-value', value),
        createElementWithText('span', 'figure-hint', hint)
    );
    return figure;
}

// ---------- Atalhos ----------

function renderActions(event, state, todayDay) {
    const container = document.getElementById('quickActions');
    container.replaceChildren();
    const isManager = hasRole(session.role, 'Gestor');
    const query = `?event=${event.event_id}`;
    const actions = [];

    if (todayDay && !todayDay.is_closed) {
        actions.push({ text: 'Registar vendas', hint: 'Abrir a caixa de hoje', href: `vendas.html${query}`, main: true });
    }

    actions.push({ text: 'Stock', hint: 'Ver o stock e registar consumo interno', href: `stock.html${query}` });
    actions.push({ text: 'Ementa', hint: 'Artigos e preços', href: `ementa.html${query}` });

    if (isManager) {
        if (state === 'upcoming') {
            actions.unshift({ text: 'Preparar compras', hint: 'Previsão e compras do evento', href: `compras.html${query}`, main: true });
        } else {
            actions.push({ text: 'Compras', hint: 'Compras e devoluções', href: `compras.html${query}` });
        }

        actions.push({ text: 'Painel', hint: 'Resultados, despesas e gráficos', href: `painel.html${query}` });

        if (state === 'past') {
            actions.unshift({ text: 'Relatório', hint: 'Encerrar e guardar o PDF', href: `relatorio.html${query}`, main: true });
        }
    }

    if (hasRole(session.role, 'Administrador')) {
        actions.push({ text: 'Utilizadores', hint: 'Contas da equipa', href: 'utilizadores.html' });
    }

    actions.forEach((action) => {
        const link = document.createElement('a');
        link.className = action.main ? 'quick-action is-main' : 'quick-action';
        link.href = action.href;
        link.append(
            createElementWithText('strong', '', action.text),
            createElementWithText('span', '', action.hint)
        );
        container.append(link);
    });
}

// ---------- Para tratar ----------

function renderTodo(event, state, days, dashboard, today) {
    const items = [];
    const isManager = hasRole(session.role, 'Gestor');
    const query = `?event=${event.event_id}`;

    dashboard.lowStock.forEach((row) => {
        const text = row.quantity < 0
            ? `${row.productName}: stock negativo. Falta registar compras ou corrigir.`
            : `${row.productName}: stock baixo (${formatQuantity(row.quantity, row.unit)}).`;
        items.push({ text, href: `stock.html${query}`, level: 'alert' });
    });

    if (isManager) {
        const openPastDays = days.filter((day) => day.event_date < today && !day.is_closed);

        if (openPastDays.length > 0) {
            items.push({ text: `${openPastDays.length} dia(s) já passaram e ainda estão abertos. Fecha-os na página Vendas.`, href: `vendas.html${query}`, level: 'warning' });
        }

        if (state === 'past' && !event.is_closed && event.is_editable !== false) {
            items.push({ text: 'O evento terminou mas ainda não foi encerrado.', href: `relatorio.html${query}`, level: 'warning' });
        }

        if (event.is_editable !== false && event.edit_deadline) {
            const left = daysBetween(today, event.edit_deadline);

            if (state === 'past' && left <= 7) {
                items.push({ text: `O prazo de edição termina daqui a ${left} dia(s), a ${formatDate(event.edit_deadline)}.`, href: `relatorio.html${query}`, level: 'warning' });
            }
        }

        if (state === 'upcoming' && dashboard.finance && dashboard.finance.purchases === 0) {
            items.push({ text: 'Ainda não há compras para este evento. Vê a previsão de compras.', href: `compras.html${query}`, level: 'info' });
        }
    }

    const list = document.getElementById('todoList');
    list.replaceChildren();
    document.getElementById('todoCount').textContent = items.length;
    document.getElementById('todoEmpty').hidden = items.length > 0;

    items.forEach((item) => {
        const line = document.createElement('li');
        line.className = `todo-${item.level}`;
        const link = createElementWithText('a', '', item.text);
        link.href = item.href;
        line.append(link);
        list.append(line);
    });
}
