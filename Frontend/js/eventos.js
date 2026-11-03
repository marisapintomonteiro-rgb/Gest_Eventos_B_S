// eventos.js: página "Eventos" (US01 Criar evento, RF04 e RF05).
// O Gestor e o Administrador criam eventos com dias, horários, objetivos e despesas iniciais.
// Todos os perfis veem a lista dos eventos da marca, mostrados como bilhetes.


// Texto curto de uma data, ex.: '2027-07-15' fica 'qui. 15 jul.'
function formatShortDate(dateValue) {
    const date = new Date(`${dateValue}T12:00:00`);
    const weekday = date.toLocaleDateString('pt-PT', { weekday: 'short' });
    const month = date.toLocaleDateString('pt-PT', { month: 'short' });
    return `${weekday} ${date.getDate()} ${month}`;
}

const eventForm = document.getElementById('eventForm');
const planner = document.getElementById('planner');
const newEventButton = document.getElementById('newEventButton');
const dayList = document.getElementById('dayList');
const expenseList = document.getElementById('expenseList');
const budgetInput = document.getElementById('budget');
const formMessage = document.getElementById('formMessage');
const pageMessage = document.getElementById('pageMessage');

let page = null;

// Número do evento que está a ser editado; ao criar, fica null
let editingEventId = null;

startEventsPage();

// Pergunta ao servidor quem entrou e só depois prepara a página
async function startEventsPage() {
    page = await startPrivatePage();

    if (!page) {
        return;
    }

    document.getElementById('eventsIntro').textContent =
        `Os eventos da ${page.brand.name}, dos mais recentes para os mais antigos.`;

    // O botão só aparece a quem pode criar eventos; quem decide de verdade é o servidor
    if (hasRole(page.session.role, 'Gestor')) {
        newEventButton.addEventListener('click', openPlanner);
        document.getElementById('cancelEventButton').addEventListener('click', closePlanner);
        document.getElementById('addDayButton').addEventListener('click', () => addDayRow());
        document.getElementById('addExpenseButton').addEventListener('click', () => addExpenseRow());
        budgetInput.addEventListener('input', updateExpenseTotal);
        clearErrorsWhileTyping(eventForm);
        eventForm.addEventListener('submit', saveEvent);
    }

    await renderEvents();
}

// ---------- Abrir e fechar o planeamento ----------

function openPlanner() {
    editingEventId = null;
    setPlannerMode('Novo evento', 'Criar evento', false);
    resetPlanner();
    planner.hidden = false;
    newEventButton.hidden = true;
    hideMessage(pageMessage);
    document.getElementById('eventName').focus();
}

function closePlanner() {
    planner.hidden = true;
    newEventButton.hidden = false;
    editingEventId = null;
}

// O mesmo formulário serve para criar e editar. Ao editar não há despesas iniciais (estão no Painel).
function setPlannerMode(title, buttonText, isEditing) {
    document.getElementById('plannerTitle').textContent = title;
    document.getElementById('createEventButton').textContent = buttonText;
    document.getElementById('initialExpenses').hidden = isEditing;
    document.getElementById('editExpensesHint').hidden = !isEditing;
}

// Abre o formulário preenchido com os dados do evento escolhido
async function openEditor(eventId) {
    let event;

    try {
        event = (await apiGetEvent(eventId)).event;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    resetPlanner();
    editingEventId = eventId;
    setPlannerMode('Editar evento', 'Guardar alterações', true);

    document.getElementById('eventName').value = event.event_name;
    document.getElementById('location').value = event.location;
    document.getElementById('expectedAudience').value = event.expected_audience !== null ? event.expected_audience : '';
    budgetInput.value = event.budget !== null ? Number(event.budget) : '';
    eventForm.querySelectorAll('input[name="spaceType"]').forEach((input) => {
        input.checked = input.value === event.space_type;
    });
    document.getElementById('trackStock').checked = eventTracksStock(event);

    dayList.replaceChildren();
    event.days.forEach((day) => addDayRow(day));

    planner.hidden = false;
    newEventButton.hidden = true;
    hideMessage(pageMessage);
    planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Formulário limpo, com uma linha de dia vazia (é obrigatório pelo menos um dia)
function resetPlanner() {
    eventForm.reset();
    clearFormErrors(eventForm);
    hideMessage(formMessage);
    dayList.replaceChildren();
    expenseList.replaceChildren();
    addDayRow();
    updateExpenseTotal();
}

// ---------- Dias do evento ----------

// Uma linha de dia; ao editar, vem preenchida com o dia que já existe
function addDayRow(day = null) {
    const row = document.getElementById('dayTemplate').content.firstElementChild.cloneNode(true);

    if (day) {
        row.querySelector('.day-date').value = day.event_date;
        row.querySelector('.day-start').value = day.start_time ? day.start_time.slice(0, 5) : '';
        row.querySelector('.day-end').value = day.end_time ? day.end_time.slice(0, 5) : '';
        row.querySelector('.day-target').value = day.revenue_target !== null ? Number(day.revenue_target) : '';
    }

    row.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => updateDayRow(row));
    });

    row.querySelector('.remove-row').addEventListener('click', () => {
        // Fica sempre pelo menos uma linha de dia
        if (dayList.children.length > 1) {
            row.remove();
        }
    });

    dayList.appendChild(row);

    if (day) {
        updateDayRow(row);
    } else {
        row.querySelector('.day-date').focus();
    }
}

// Atualiza o mini-bilhete (dia e dia da semana) e o aviso de "passa da meia-noite"
function updateDayRow(row) {
    const dateValue = row.querySelector('.day-date').value;
    const startTime = row.querySelector('.day-start').value;
    const endTime = row.querySelector('.day-end').value;

    if (dateValue) {
        const date = new Date(`${dateValue}T12:00:00`);
        row.querySelector('.stub-day').textContent = date.getDate();
        row.querySelector('.stub-label').textContent =
            `${date.toLocaleDateString('pt-PT', { weekday: 'short' })} ${date.toLocaleDateString('pt-PT', { month: 'short' })}`;
    }

    // Se fecha mais cedo do que abre (ex.: 20:00 até 02:00), passa da meia-noite (secção 8 do CLAUDE.md)
    const night = row.querySelector('.night');
    const passesMidnight = startTime && endTime && endTime < startTime;
    night.hidden = !passesMidnight;

    if (passesMidnight) {
        const dayText = dateValue ? `dia ${new Date(`${dateValue}T12:00:00`).getDate()}` : 'este dia';
        row.querySelector('.night-text').textContent =
            `Fecha às ${endTime} do dia seguinte, mas as vendas contam para ${dayText}.`;
    }
}

// Lê as linhas dos dias no formato que o servidor espera
function readDays() {
    return Array.from(dayList.children).map((row) => ({
        date: row.querySelector('.day-date').value,
        startTime: row.querySelector('.day-start').value || null,
        endTime: row.querySelector('.day-end').value || null,
        revenueTarget: row.querySelector('.day-target').value || null
    }));
}

// ---------- Despesas iniciais ----------

function addExpenseRow() {
    const row = document.getElementById('expenseTemplate').content.firstElementChild.cloneNode(true);

    row.querySelector('.expense-amount').addEventListener('input', updateExpenseTotal);
    row.querySelector('.remove-row').addEventListener('click', () => {
        row.remove();
        updateExpenseTotal();
    });

    expenseList.appendChild(row);
    row.querySelector('.expense-description').focus();
}

// Só as linhas preenchidas: uma linha deixada em branco não conta como despesa
function readExpenses() {
    return Array.from(expenseList.children)
        .map((row) => ({
            description: row.querySelector('.expense-description').value.trim(),
            type: row.querySelector('.expense-type').value,
            amount: row.querySelector('.expense-amount').value
        }))
        .filter((expense) => expense.description || expense.amount);
}

// Soma as despesas e mostra quanto sobra do orçamento (só uma conta na página, não é guardada)
function updateExpenseTotal() {
    const total = readExpenses().reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    document.getElementById('expenseTotal').textContent = MONEY.format(total);

    const budget = Number(budgetInput.value);
    const budgetNote = document.getElementById('budgetNote');

    if (budgetInput.value && budget >= 0) {
        const rest = budget - total;
        budgetNote.textContent = rest >= 0
            ? `Do orçamento de ${MONEY.format(budget)} ficam ${MONEY.format(rest)}.`
            : `As despesas passam o orçamento de ${MONEY.format(budget)} em ${MONEY.format(-rest)}.`;
    } else {
        budgetNote.textContent = '';
    }
}

// ---------- Criar o evento ----------

// Cria um evento novo ou guarda as alterações, conforme o modo do formulário
async function saveEvent(event) {
    event.preventDefault();
    clearFormErrors(eventForm);
    hideMessage(formMessage);

    const eventNameInput = document.getElementById('eventName');
    const locationInput = document.getElementById('location');
    const spaceTypeInput = eventForm.querySelector('input[name="spaceType"]:checked');

    // Verificações rápidas na página; as regras completas da US01 são confirmadas pelo servidor
    let isValid = true;

    if (eventNameInput.value.trim() === '') {
        showFieldError(eventNameInput, 'Indica o nome do evento.');
        isValid = false;
    }

    if (locationInput.value.trim() === '') {
        showFieldError(locationInput, 'Indica o local do evento.');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    const eventData = {
        eventName: eventNameInput.value.trim(),
        location: locationInput.value.trim(),
        spaceType: spaceTypeInput ? spaceTypeInput.value : null,
        expectedAudience: document.getElementById('expectedAudience').value || null,
        budget: budgetInput.value || null,
        trackStock: document.getElementById('trackStock').checked,
        days: readDays(),
        expenses: readExpenses()
    };

    const createButton = document.getElementById('createEventButton');
    createButton.disabled = true;

    try {
        const wasEditing = editingEventId !== null;

        if (wasEditing) {
            await apiUpdateEvent(editingEventId, eventData);
        } else {
            await apiCreateEvent(eventData);
        }

        closePlanner();
        await renderEvents();
        showMessage(pageMessage, `O evento "${eventData.eventName}" foi ${wasEditing ? 'alterado' : 'criado'}.`, 'is-success');
    } catch (error) {
        // A mensagem vem do servidor, por exemplo "Escolhe pelo menos um dia para o evento."
        showMessage(formMessage, error.message, 'is-error');
    } finally {
        createButton.disabled = false;
    }
}

// ---------- Lista dos eventos (bilhetes) ----------

async function renderEvents() {
    const eventList = document.getElementById('eventList');
    const emptyState = document.getElementById('emptyState');
    let events;

    try {
        const result = await apiListEvents();
        events = result.events;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    eventList.replaceChildren();
    document.getElementById('eventCount').textContent = events.length;

    emptyState.hidden = events.length > 0;
    emptyState.textContent = hasRole(page.session.role, 'Gestor')
        ? 'Ainda não há eventos. Carrega em "Novo evento" para planear o primeiro.'
        : 'Ainda não há eventos nesta marca.';

    events.forEach((item) => eventList.appendChild(createTicket(item)));
}

// Um bilhete: talão com o primeiro dia e, ao lado, o nome, o local e os dias
function createTicket(item) {
    const ticket = document.createElement('article');
    ticket.className = 'ticket';

    const stub = document.createElement('div');
    stub.className = 'ticket-stub';

    if (item.first_day) {
        const firstDay = new Date(`${item.first_day}T12:00:00`);
        stub.append(
            createElementWithText('div', 'ticket-day', firstDay.getDate()),
            createElementWithText('div', 'ticket-month', firstDay.toLocaleDateString('pt-PT', { month: 'short' })),
            createElementWithText('div', 'ticket-year', firstDay.getFullYear())
        );
    }

    const body = document.createElement('div');
    body.className = 'ticket-body';
    body.append(
        createElementWithText('h3', 'ticket-name', item.event_name),
        createElementWithText('p', 'ticket-place', item.location)
    );

    const days = document.createElement('div');
    days.className = 'ticket-days';
    const dates = item.dates ? item.dates.split(',') : [];

    dates.forEach((dateValue) => {
        days.appendChild(createElementWithText('span', 'day-pill', formatShortDate(dateValue)));
    });

    body.appendChild(days);

    // Estado do evento (RF25, RF26) e atalhos para as páginas deste evento (histórico, RF28)
    let status = 'A decorrer';

    if (item.is_closed) {
        status = 'Encerrado';
    }

    if (item.is_editable === false) {
        status = item.is_closed ? 'Encerrado · só consulta' : 'Só consulta';
    }

    body.insertBefore(createElementWithText('span', item.is_closed ? 'ticket-status is-closed' : 'ticket-status', status), body.firstChild);

    // Evento só com valores (sem controlo de stock)
    if (!eventTracksStock(item)) {
        body.firstChild.after(createElementWithText('span', 'ticket-status simple-tag', 'Só valores'));
    }

    const links = document.createElement('div');
    links.className = 'ticket-links';
    const shortcuts = [['Painel', 'painel.html'], ['Vendas', 'vendas.html'], ['Ementa', 'ementa.html']];

    if (hasRole(page.session.role, 'Gestor')) {
        shortcuts.push(['Relatório', 'relatorio.html']);
    }

    // Editar só aparece dentro do prazo de edição (RF26); o servidor confirma
    if (hasRole(page.session.role, 'Gestor') && item.is_editable !== false) {
        const editButton = createElementWithText('button', 'link-button ticket-edit', 'Editar');
        editButton.type = 'button';
        editButton.setAttribute('aria-label', `Editar ${item.event_name}`);
        editButton.addEventListener('click', () => openEditor(item.event_id));
        links.append(editButton);
    }

    shortcuts.forEach(([text, file]) => {
        const link = createElementWithText('a', 'ticket-link', text);
        link.href = `${file}?event=${item.event_id}`;
        links.append(link);
    });

    body.appendChild(links);

    ticket.append(stub, body);
    return ticket;
}
