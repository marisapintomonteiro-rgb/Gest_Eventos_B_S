// eventos.js: página "Eventos" (US01 Criar evento, RF04 e RF05).
// O Gestor e o Administrador criam eventos com dias, horários, objetivos e despesas iniciais.
// Todos os perfis veem a lista dos eventos da marca, mostrados como bilhetes.

const MONEY = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

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
        eventForm.addEventListener('submit', createEvent);
    }

    await renderEvents();
}

// ---------- Abrir e fechar o planeamento ----------

function openPlanner() {
    resetPlanner();
    planner.hidden = false;
    newEventButton.hidden = true;
    hideMessage(pageMessage);
    document.getElementById('eventName').focus();
}

function closePlanner() {
    planner.hidden = true;
    newEventButton.hidden = false;
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

function addDayRow() {
    const row = document.getElementById('dayTemplate').content.firstElementChild.cloneNode(true);

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
    row.querySelector('.day-date').focus();
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

async function createEvent(event) {
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
        days: readDays(),
        expenses: readExpenses()
    };

    const createButton = document.getElementById('createEventButton');
    createButton.disabled = true;

    try {
        await apiCreateEvent(eventData);
        closePlanner();
        await renderEvents();
        showMessage(pageMessage, `O evento "${eventData.eventName}" foi criado.`, 'is-success');
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
    ticket.append(stub, body);
    return ticket;
}

function createElementWithText(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
}
