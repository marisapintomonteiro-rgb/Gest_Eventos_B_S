// controllers/calendarController.js: calendário dos eventos (RF06) com desempenho e aviso de lucro (RF32).
// Cor de cada dia, comparando a faturação com o objetivo do dia (RF05):
//   acima do expectável: mais de 110%; cumpriu: entre 90% e 110%; abaixo: menos de 90%.
//   Sem objetivo, ou ainda sem vendas: sem cor.
// Aviso de lucro (só Gestor e Administrador): o primeiro dia em que a faturação acumulada do evento
// iguala ou ultrapassa tudo o que foi pago (despesas + todas as compras).

const eventModel = require('../models/eventModel');

function getPerformance(revenue, target, saleCount) {
    if (target === null || target <= 0 || saleCount === 0) {
        return null;
    }

    const percent = (revenue / target) * 100;

    if (percent > 110) {
        return 'acima';
    }

    if (percent >= 90) {
        return 'cumpriu';
    }

    return 'abaixo';
}

// Para cada evento, o primeiro dia em que a faturação acumulada cobre o que foi pago
function findProfitDays(days, paidByEvent) {
    const profitDays = {};
    const cumulative = {};

    days.forEach((day) => {
        const paid = paidByEvent[day.event_id] || 0;
        cumulative[day.event_id] = (cumulative[day.event_id] || 0) + Number(day.revenue);

        if (paid > 0 && !profitDays[day.event_id] && cumulative[day.event_id] >= paid) {
            profitDays[day.event_id] = day.event_day_id;
        }
    });

    return profitDays;
}

// GET /api/events/calendar
async function getCalendar(req, res) {
    const { brandId, role } = req.session.user;
    const isManager = role !== 'Colaborador';

    try {
        const days = await eventModel.findCalendarDays(brandId);
        let profitDays = {};

        if (isManager) {
            const paidRows = await eventModel.findPaidByEvent(brandId);
            const paidByEvent = {};
            paidRows.forEach((row) => {
                paidByEvent[row.event_id] = Number(row.paid);
            });
            profitDays = findProfitDays(days, paidByEvent);
        }

        res.json({
            days: days.map((day) => {
                const revenue = Number(day.revenue);
                const target = day.revenue_target === null ? null : Number(day.revenue_target);

                return {
                    eventDayId: day.event_day_id,
                    date: day.event_date,
                    startTime: day.start_time,
                    endTime: day.end_time,
                    eventId: day.event_id,
                    eventName: day.event_name,
                    location: day.location,
                    revenue,
                    target,
                    performance: getPerformance(revenue, target, Number(day.sale_count)),
                    isProfitDay: profitDays[day.event_id] === day.event_day_id
                };
            })
        });
    } catch (error) {
        console.error('Erro ao montar o calendário:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o calendário. Tenta novamente.' });
    }
}

module.exports = { getCalendar };
