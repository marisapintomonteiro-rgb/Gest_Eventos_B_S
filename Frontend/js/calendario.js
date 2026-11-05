// calendario.js: calendário dos eventos (RF06) com o desempenho de cada dia e o aviso de lucro (RF32).
// O servidor decide a cor de cada dia (acima / cumpriu / abaixo) e o primeiro dia com lucro.

const PERFORMANCE_TEXT = {
    acima: 'Acima do expectável',
    cumpriu: 'Cumpriu as expectativas',
    abaixo: 'Abaixo do expectável'
};

const pageMessage = document.getElementById('pageMessage');

let calendarDays = [];
let shownMonth = null; // primeiro dia do mês mostrado

startCalendarPage();

async function startCalendarPage() {
    const page = await startPrivatePage();

    if (!page) {
        return;
    }

    try {
        calendarDays = (await apiGetCalendar()).days;
    } catch (error) {
        showMessage(pageMessage, error.message, 'is-error');
        return;
    }

    shownMonth = chooseStartMonth();
    document.getElementById('previousMonthButton').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthButton').addEventListener('click', () => changeMonth(1));

    renderMonth();
    renderProfitWarnings();
}

// Começa no mês de hoje se houver dias de eventos nele; senão, no mês do próximo dia de evento
// (ou do último, se já passaram todos)
function chooseStartMonth() {
    const today = new Date().toLocaleDateString('sv-SE');
    const thisMonth = today.slice(0, 7);
    let chosen = thisMonth;

    if (!calendarDays.some((day) => day.date.startsWith(thisMonth)) && calendarDays.length > 0) {
        const next = calendarDays.find((day) => day.date >= today);
        chosen = (next || calendarDays[calendarDays.length - 1]).date.slice(0, 7);
    }

    return new Date(`${chosen}-01T12:00:00`);
}

function changeMonth(step) {
    shownMonth.setMonth(shownMonth.getMonth() + step);
    renderMonth();
}

function toDateText(date) {
    return date.toLocaleDateString('sv-SE');
}

// Desenha a grelha do mês: semanas de segunda a domingo
function renderMonth() {
    const grid = document.getElementById('calendarGrid');
    grid.querySelectorAll('.calendar-cell').forEach((cell) => cell.remove());

    const title = shownMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    document.getElementById('monthTitle').textContent = title.charAt(0).toUpperCase() + title.slice(1);

    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // segunda = 0
    const today = toDateText(new Date());

    for (let blank = 0; blank < firstWeekday; blank += 1) {
        const empty = document.createElement('div');
        empty.className = 'calendar-cell is-empty';
        grid.append(empty);
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
        const dateText = toDateText(new Date(year, month, dayNumber, 12));
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        if (dateText === today) {
            cell.classList.add('is-today');
        }

        cell.append(createElementWithText('span', 'calendar-number', String(dayNumber)));

        calendarDays
            .filter((day) => day.date === dateText)
            .forEach((day) => cell.append(createDayChip(day)));

        grid.append(cell);
    }

    renderMonthList();
}

// Um dia de evento dentro do calendário: nome do evento, faturação e cor do desempenho
function createDayChip(day) {
    const chip = document.createElement('a');
    chip.className = `day-chip${day.performance ? ` perf-${day.performance}` : ''}`;
    chip.href = `vendas.html?event=${day.eventId}`;
    chip.title = describeDay(day);

    chip.append(createElementWithText('span', 'chip-name', day.eventName));

    if (day.revenue > 0) {
        chip.append(createElementWithText('span', 'chip-revenue', MONEY.format(day.revenue)));
    }

    if (day.isProfitDay) {
        const mark = createElementWithText('span', 'profit-mark', '€');
        mark.title = 'Primeiro dia com lucro';
        chip.append(mark);
    }

    return chip;
}

function describeDay(day) {
    // O Colaborador não recebe a faturação (vem a null): mostra só o nome e o desempenho (RF30)
    const parts = [day.revenue === null ? day.eventName : `${day.eventName}: ${MONEY.format(day.revenue)}`];

    if (day.target !== null) {
        parts.push(`objetivo ${MONEY.format(day.target)} (${Math.round((day.revenue / day.target) * 100)}%)`);
    }

    parts.push(day.performance ? PERFORMANCE_TEXT[day.performance] : 'sem objetivo ou sem vendas');
    return parts.join(' · ');
}

function renderMonthList() {
    const monthKey = toDateText(shownMonth).slice(0, 7);
    const days = calendarDays.filter((day) => day.date.startsWith(monthKey));
    const list = document.getElementById('monthList');
    list.replaceChildren();
    document.getElementById('monthEmpty').hidden = days.length > 0;

    days.forEach((day) => {
        const item = document.createElement('li');
        const date = new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' });
        item.append(
            createElementWithText('span', `perf-swatch${day.performance ? ` perf-${day.performance}` : ''}`, ''),
            createElementWithText('strong', '', date),
            createElementWithText('span', 'month-list-text', describeDay(day))
        );

        if (day.isProfitDay) {
            item.append(createElementWithText('span', 'tag tag-profit', 'Primeiro dia com lucro'));
        }

        list.append(item);
    });
}

// Aviso de lucro: um por evento que já chegou ao lucro (só chega ao Gestor e ao Administrador)
function renderProfitWarnings() {
    const profitDays = calendarDays.filter((day) => day.isProfitDay);
    const panel = document.getElementById('profitPanel');
    const list = document.getElementById('profitList');
    list.replaceChildren();
    panel.hidden = profitDays.length === 0;

    profitDays.forEach((day) => {
        const date = new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-PT');
        list.append(createElementWithText('li', '', `${day.eventName}: a ${date}, a faturação acumulada já cobriu as despesas e todas as compras.`));
    });
}
