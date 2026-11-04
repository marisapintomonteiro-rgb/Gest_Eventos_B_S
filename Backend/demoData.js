// demoData.js: cria uma marca de demonstração com dados simulados, para apresentar a aplicação.
// Usa a própria API (os mesmos endereços que as páginas usam), por isso todas as regras são aplicadas.
//
// Como usar (na pasta Backend):
//   node demoData.js http://localhost:3000 --dia 2026-11-05
//   node demoData.js https://gest-eventos.onrender.com --dia 2026-11-05
//
// --dia é o dia da apresentação: o evento "a decorrer" inclui esse dia. Sem --dia, usa o dia de hoje.
// --marca "Nome" muda o nome da marca (por defeito: Marca de Demonstração).
// A palavra-passe das três contas é pedida no terminal e não fica guardada em lado nenhum.

const readline = require('readline');

// ---------- Opções ----------
const args = process.argv.slice(2);
const baseUrl = (args.find((arg) => arg.startsWith('http')) || 'http://localhost:3000').replace(/\/$/, '');

function readOption(name, fallback) {
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const BRAND_NAME = readOption('--marca', 'Marca de Demonstração');
// Domínio dos emails a partir do nome da marca (ex.: marca-de-demonstracao.test). Os emails nunca são enviados.
const EMAIL_DOMAIN = `${BRAND_NAME.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.test`;
const EMAILS = {
    Administrador: `admin@${EMAIL_DOMAIN}`,
    Gestor: `gestor@${EMAIL_DOMAIN}`,
    Colaborador: `colaborador@${EMAIL_DOMAIN}`
};

// ---------- Datas ----------
const presentationDay = readOption('--dia', new Date().toLocaleDateString('sv-SE'));

// Dia AAAA-MM-DD a "offset" dias do dia da apresentação
function day(offset) {
    const date = new Date(`${presentationDay}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
}

// ---------- Ligação à API ----------
// Cada conta tem o seu "browser": guarda o cookie da sessão
class ApiClient {
    constructor(label) {
        this.label = label;
        this.cookie = '';
    }

    async request(method, path, body) {
        const options = { method, headers: {} };

        if (body !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        if (this.cookie) {
            options.headers.Cookie = this.cookie;
        }

        const response = await fetch(baseUrl + path, options);
        const setCookie = response.headers.get('set-cookie');

        if (setCookie) {
            this.cookie = setCookie.split(';')[0];
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(`${method} ${path} (${this.label}): ${result.error || response.status}`);
        }

        return result;
    }

    get(path) { return this.request('GET', path); }
    post(path, body) { return this.request('POST', path, body); }
    put(path, body) { return this.request('PUT', path, body); }
}

// Pede a palavra-passe sem a mostrar no ecrã
function askPassword(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl.stdoutMuted = false;
        rl._writeToOutput = function writeToOutput(text) {
            rl.output.write(rl.stdoutMuted ? '' : text);
        };
        rl.question(question, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
        rl.stdoutMuted = true;
    });
}

function step(text) {
    console.log(`  ✓ ${text}`);
}

// ---------- Dados simulados ----------
const SUPPLIERS = [
    { key: 'norte', supplierName: 'Distribuidora do Norte (demo)', contact: '910000001', email: `encomendas@${EMAIL_DOMAIN}`, acceptsReturns: true },
    { key: 'mercado', supplierName: 'Mercado Abastecedor (demo)', contact: '910000002', acceptsReturns: false },
    { key: 'talho', supplierName: 'Talho Central (demo)', contact: '910000003', acceptsReturns: false }
];

// unit: mililitro, grama ou unidade; pack: quanto tem cada embalagem; price: preço por embalagem
const PRODUCTS = [
    { key: 'barril', productName: 'Cerveja em barril 30 L', unit: 'mililitro', pack: 30000, price: 85, supplier: 'norte', minStock: 30000 },
    { key: 'garrafa', productName: 'Cerveja garrafa 33 cl', unit: 'unidade', pack: 24, price: 18, supplier: 'norte', minStock: 24 },
    { key: 'agua', productName: 'Água 50 cl', unit: 'unidade', pack: 24, price: 5, supplier: 'norte' },
    { key: 'rum', productName: 'Rum branco', unit: 'mililitro', pack: 700, price: 12.5, supplier: 'norte', minStock: 2800 },
    { key: 'vodka', productName: 'Vodka', unit: 'mililitro', pack: 700, price: 11, supplier: 'norte', minStock: 1400 },
    { key: 'lima', productName: 'Lima', unit: 'unidade', pack: 50, price: 15, supplier: 'mercado', perishable: true },
    { key: 'hortela', productName: 'Hortelã', unit: 'grama', pack: 500, price: 6, supplier: 'mercado', perishable: true, residual: true },
    { key: 'acucar', productName: 'Açúcar', unit: 'grama', pack: 1000, price: 1.2, supplier: 'mercado', residual: true },
    { key: 'gelo', productName: 'Gelo', unit: 'grama', pack: 10000, price: 4, supplier: 'mercado', minStock: 20000 },
    { key: 'pao', productName: 'Pão para bifana', unit: 'unidade', pack: 50, price: 12, supplier: 'mercado', perishable: true },
    { key: 'carne', productName: 'Carne de bifana', unit: 'grama', pack: 5000, price: 40, supplier: 'talho', perishable: true }
];

// recipe: [produto, quantidade por venda] (null = residual, não é descontado)
const MENU = [
    { itemName: 'Fino', category: 'Bebidas', price: 2, itemType: 'Direta', recipe: [['barril', 220]], perDay: 300 },
    { itemName: 'Cerveja garrafa', category: 'Bebidas', price: 2.5, itemType: 'Direta', recipe: [['garrafa', 1]], perDay: 80 },
    { itemName: 'Água', category: 'Bebidas', price: 1.5, itemType: 'Direta', recipe: [['agua', 1]], perDay: 60 },
    { itemName: 'Mojito', category: 'Cocktails', price: 6, itemType: 'Composta', recipe: [['rum', 50], ['lima', 0.5], ['hortela', null], ['acucar', null], ['gelo', 150]], perDay: 70 },
    { itemName: 'Caipiroska', category: 'Cocktails', price: 6, itemType: 'Composta', recipe: [['vodka', 50], ['lima', 0.5], ['acucar', null], ['gelo', 150]], perDay: 40 },
    { itemName: 'Shot de vodka', category: 'Shots', price: 2.5, itemType: 'Direta', recipe: [['vodka', 30]], perDay: 50 },
    { itemName: 'Bifana', category: 'Comida', price: 4.5, itemType: 'Composta', recipe: [['pao', 1], ['carne', 120]], perDay: 90 }
];

// Quanto se vende em cada dia, em relação a um dia normal (ex.: sábado vende mais)
function salesForDay(factor) {
    return MENU.map((item) => ({ itemName: item.itemName, quantity: Math.round(item.perDay * factor) }));
}

// Quanto de cada produto gastam estas vendas
function consumption(daySales) {
    const total = {};

    daySales.flat().forEach(({ itemName, quantity }) => {
        const item = MENU.find((menuItem) => menuItem.itemName === itemName);
        item.recipe.forEach(([key, perSale]) => {
            if (perSale !== null) {
                total[key] = (total[key] || 0) + perSale * quantity;
            }
        });
    });

    return total;
}

// Embalagens a comprar: o consumo com uma margem; os residuais compram-se em quantidade fixa
function packagesToBuy(need, margin, overrides = {}) {
    return PRODUCTS.map((product) => {
        const extra = overrides[product.key] !== undefined ? overrides[product.key] : margin;
        const quantity = product.residual ? product.pack * 2 : (need[product.key] || 0) * (1 + extra);
        return { product, packages: Math.max(1, Math.ceil(quantity / product.pack)) };
    });
}

// ---------- Passos ----------
async function main() {
    console.log(`\nDemonstração Bebe e Siga em ${baseUrl}`);
    console.log(`Dia da apresentação: ${presentationDay} · Marca: ${BRAND_NAME}`);
    console.log(`Contas: ${Object.values(EMAILS).join(', ')}\n`);

    const password = await askPassword('Palavra-passe para as três contas (mínimo 8 caracteres): ');

    if (password.length < 8) {
        throw new Error('A palavra-passe tem de ter pelo menos 8 caracteres.');
    }

    const admin = new ApiClient('Administrador');
    const gestor = new ApiClient('Gestor');
    const colab = new ApiClient('Colaborador');

    // 1. Marca e contas
    await admin.post('/api/auth/register', {
        brandName: BRAND_NAME,
        users: Object.entries(EMAILS).map(([role, email]) => ({ role, email, password }))
    });
    step(`Marca "${BRAND_NAME}" registada com as três contas`);

    await admin.post('/api/auth/login', { email: EMAILS.Administrador, password });
    await gestor.post('/api/auth/login', { email: EMAILS.Gestor, password });
    await colab.post('/api/auth/login', { email: EMAILS.Colaborador, password });
    step('Sessões abertas');

    // 2. Fornecedores e produtos
    const supplierIds = {};

    for (const supplier of SUPPLIERS) {
        const result = await gestor.post('/api/suppliers', supplier);
        supplierIds[supplier.key] = result.supplierId;
    }

    const productIds = {};

    for (const product of PRODUCTS) {
        const suppliers = [{ supplierId: supplierIds[product.supplier], isMain: true, packagePrice: product.price }];

        // A cerveja tem também um fornecedor alternativo, mais caro
        if (product.key === 'barril') {
            suppliers.push({ supplierId: supplierIds.mercado, isMain: false, packagePrice: 92 });
        }

        const result = await gestor.post('/api/products', {
            productName: product.productName,
            unit: product.unit,
            packageQuantity: product.pack,
            minStock: product.minStock === undefined ? null : product.minStock,
            isPerishable: Boolean(product.perishable),
            isResidual: Boolean(product.residual),
            suppliers
        });
        productIds[product.key] = result.productId;
    }

    step(`${SUPPLIERS.length} fornecedores e ${PRODUCTS.length} produtos`);

    // Helpers que dependem dos ids
    async function createEvent(data) {
        const result = await gestor.post('/api/events', data);
        const days = (await gestor.get(`/api/events/${result.eventId}/days`)).days;
        return { eventId: result.eventId, days };
    }

    async function menuIds(eventId) {
        const items = (await gestor.get(`/api/events/${eventId}/menu`)).items;
        const ids = {};
        items.forEach((item) => { ids[item.item_name] = item.menu_item_id; });
        return ids;
    }

    async function buy(eventId, purchaseDate, lines, notes) {
        const bySupplier = {};

        lines.forEach(({ product, packages }) => {
            bySupplier[product.supplier] = bySupplier[product.supplier] || [];
            bySupplier[product.supplier].push({ productId: productIds[product.key], packages, packagePrice: product.price });
        });

        for (const [supplierKey, supplierLines] of Object.entries(bySupplier)) {
            await gestor.post(`/api/events/${eventId}/purchases`, {
                supplierId: supplierIds[supplierKey], purchaseDate, notes: notes || null, lines: supplierLines
            });
        }
    }

    // Regista as vendas de um dia em três "turnos", repartidos entre o Colaborador e o Gestor
    async function sell(eventId, dayId, ids, daySales) {
        const shares = [[colab, 0.35], [colab, 0.4], [gestor, 0.25]];
        const remaining = Object.fromEntries(daySales.map((sale) => [sale.itemName, sale.quantity]));

        for (let index = 0; index < shares.length; index += 1) {
            const [client, share] = shares[index];
            const isLast = index === shares.length - 1;
            const lines = daySales.map(({ itemName, quantity }) => {
                const amount = isLast ? remaining[itemName] : Math.round(quantity * share);
                remaining[itemName] -= amount;
                return { menuItemId: ids[itemName], quantity: amount };
            }).filter((line) => line.quantity > 0);

            if (lines.length > 0) {
                await client.post(`/api/events/${eventId}/sales`, { eventDayId: dayId, lines });
            }
        }
    }

    // 3. Edição anterior: Mercado de Outono, 1.ª edição (terminou e foi encerrada)
    const first = await createEvent({
        eventName: 'Mercado de Outono — 1.ª edição',
        location: 'Jardim da Cordoaria, Porto',
        spaceType: 'Exterior',
        expectedAudience: 2500,
        budget: 4000,
        days: [
            { date: day(-25), startTime: '18:00', endTime: '02:00', revenueTarget: 1800 },
            { date: day(-24), startTime: '16:00', endTime: '03:00', revenueTarget: 2400 },
            { date: day(-23), startTime: '16:00', endTime: '23:00', revenueTarget: 1500 }
        ],
        expenses: [
            { description: 'Aluguer do espaço', type: 'Fixa', amount: 600 },
            { description: 'Licença municipal', type: 'Fixa', amount: 90 }
        ]
    });

    for (const item of MENU) {
        await gestor.post(`/api/events/${first.eventId}/menu`, {
            itemName: item.itemName,
            category: item.category,
            price: item.price,
            itemType: item.itemType,
            products: item.recipe.map(([key, quantity]) => ({ productId: productIds[key], quantity }))
        });
    }

    const firstSales = [salesForDay(0.85), salesForDay(1.25), salesForDay(0.8)];
    await buy(first.eventId, day(-27), packagesToBuy(consumption(firstSales), 0.15), 'Compra inicial');
    const firstIds = await menuIds(first.eventId);

    for (let index = 0; index < first.days.length; index += 1) {
        await sell(first.eventId, first.days[index].event_day_id, firstIds, firstSales[index]);
    }

    const firstNotes = [
        ['Meteorologia', 'Noite fresca mas sem chuva. Muita gente depois das 22h.'],
        ['Produtos esgotados', 'O gelo acabou à 01h30. Para a próxima, comprar mais gelo para sábado.'],
        ['Afluência', 'Domingo mais calmo, sobretudo famílias ao fim da tarde.']
    ];

    for (let index = 0; index < first.days.length; index += 1) {
        const dayId = first.days[index].event_day_id;
        await gestor.post(`/api/events/${first.eventId}/notes`, { noteType: firstNotes[index][0], noteText: firstNotes[index][1], eventDayId: dayId });
        await gestor.post(`/api/events/${first.eventId}/expenses`, { description: 'Pessoal extra', type: 'Variável', amount: 120, eventDayId: dayId });
    }

    await colab.post(`/api/events/${first.eventId}/stock/movements`, { type: 'Consumo interno', eventDayId: first.days[0].event_day_id, productId: productIds.agua, quantity: 12, reason: 'Águas para a equipa' });
    await gestor.post(`/api/events/${first.eventId}/stock/movements`, { type: 'Quebra', eventDayId: first.days[1].event_day_id, productId: productIds.garrafa, quantity: 4, reason: 'Caixa caiu na montagem' });
    await gestor.post(`/api/events/${first.eventId}/stock/movements`, { type: 'Desperdício', eventDayId: first.days[2].event_day_id, productId: productIds.lima, quantity: 6, reason: 'Limas estragadas' });

    for (const eventDay of first.days) {
        await gestor.post(`/api/events/${first.eventId}/days/${eventDay.event_day_id}/close`);
    }

    // Devolução de uma caixa de cerveja fechada (o fornecedor aceita devoluções)
    await gestor.post(`/api/events/${first.eventId}/returns`, {
        supplierId: supplierIds.norte, productId: productIds.garrafa, packages: 1, packagePrice: 18, returnDate: day(-22)
    });
    await gestor.post(`/api/events/${first.eventId}/notes`, { noteType: 'Outro', noteText: 'Correu bem. Na próxima edição: mais gelo e mais um ponto de venda de bifanas.' });
    await gestor.post(`/api/events/${first.eventId}/close`);
    step('"Mercado de Outono — 1.ª edição": vendas, notas, perdas, devolução, dias fechados e evento encerrado');

    // O preço do barril subiu entretanto (fica no histórico de preços)
    await gestor.post(`/api/products/${productIds.barril}/prices`, { supplierId: supplierIds.norte, packagePrice: 88 });

    // 4. Evento a decorrer: Mercado de Outono, 2.ª edição (inclui o dia da apresentação)
    const current = await createEvent({
        eventName: 'Mercado de Outono — 2.ª edição',
        location: 'Jardim da Cordoaria, Porto',
        spaceType: 'Exterior',
        expectedAudience: 3000,
        budget: 4500,
        days: [
            { date: day(-3), startTime: '18:00', endTime: '02:00', revenueTarget: 2200 },
            { date: day(-2), startTime: '16:00', endTime: '03:00', revenueTarget: 2400 },
            { date: day(-1), startTime: '16:00', endTime: '02:00', revenueTarget: 2300 },
            { date: day(0), startTime: '18:00', endTime: '02:00', revenueTarget: 1800 },
            { date: day(1), startTime: '16:00', endTime: '23:00', revenueTarget: 1500 }
        ],
        expenses: [
            { description: 'Aluguer do espaço', type: 'Fixa', amount: 650 },
            { description: 'Licença municipal', type: 'Fixa', amount: 90 },
            { description: 'Decoração e iluminação', type: 'Fixa', amount: 180 }
        ]
    });

    await gestor.put(`/api/events/${current.eventId}/previous`, { previousEventId: first.eventId });
    await gestor.post(`/api/events/${current.eventId}/menu/copy`, { fromEventId: first.eventId });
    const currentIds = await menuIds(current.eventId);

    // Vendas dos três primeiros dias; compras à justa no rum e no gelo, para aparecer o stock baixo
    const currentSales = [salesForDay(1.0), salesForDay(1.3), salesForDay(0.9)];
    const currentNeed = consumption(currentSales);
    await buy(current.eventId, day(-4), packagesToBuy(currentNeed, 0.3, { rum: 0.04, gelo: 0.02, vodka: 0.1, garrafa: 0.15 }), 'Compra inicial');
    await buy(current.eventId, day(-2), [{ product: PRODUCTS.find((product) => product.key === 'barril'), packages: 1 }].map((line) => ({ ...line, product: { ...line.product, price: 88 } })), 'Reforço a meio do evento');

    for (let index = 0; index < currentSales.length; index += 1) {
        await sell(current.eventId, current.days[index].event_day_id, currentIds, currentSales[index]);
    }

    await colab.post(`/api/events/${current.eventId}/stock/movements`, { type: 'Consumo interno', eventDayId: current.days[0].event_day_id, productId: productIds.agua, quantity: 15, reason: 'Águas para a equipa' });
    await gestor.post(`/api/events/${current.eventId}/stock/movements`, { type: 'Oferta', eventDayId: current.days[1].event_day_id, productId: productIds.garrafa, quantity: 6, reason: 'Oferta à banda' });
    await gestor.post(`/api/events/${current.eventId}/stock/corrections`, { productId: productIds.hortela, newQuantity: 400, reason: 'Contagem física ao fim do 2.º dia' });

    const currentNotes = [
        ['Meteorologia', 'Noite amena. Boa afluência a partir das 21h.'],
        ['Horário de maior movimento', 'Pico entre as 23h e a 01h, com fila no bar dos cocktails.'],
        ['Produtos esgotados', 'Quase sem gelo no fim da noite: comprar antes de abrir.']
    ];

    for (let index = 0; index < currentNotes.length; index += 1) {
        await gestor.post(`/api/events/${current.eventId}/notes`, { noteType: currentNotes[index][0], noteText: currentNotes[index][1], eventDayId: current.days[index].event_day_id });
    }

    await gestor.post(`/api/events/${current.eventId}/expenses`, { description: 'Pessoal extra', type: 'Variável', amount: 140, eventDayId: current.days[1].event_day_id });
    await gestor.post(`/api/events/${current.eventId}/expenses`, { description: 'Gerador', type: 'Variável', amount: 60, eventDayId: current.days[2].event_day_id });

    // Os dois primeiros dias ficam fechados; o terceiro fica aberto (aparece em "Para tratar")
    await gestor.post(`/api/events/${current.eventId}/days/${current.days[0].event_day_id}/close`);
    await gestor.post(`/api/events/${current.eventId}/days/${current.days[1].event_day_id}/close`);
    step('"Mercado de Outono — 2.ª edição": a decorrer, com vendas em 3 dias, stock baixo e o dia da apresentação livre para vender');

    // 5. Próximo evento: Feira de Natal (ementa copiada; previsão pela 2.ª edição)
    const next = await createEvent({
        eventName: 'Feira de Natal',
        location: 'Praça da Batalha, Porto',
        spaceType: 'Misto',
        expectedAudience: 4000,
        budget: 5000,
        days: [
            { date: day(35), startTime: '15:00', endTime: '23:00', revenueTarget: 1600 },
            { date: day(36), startTime: '15:00', endTime: '00:00', revenueTarget: 2200 },
            { date: day(37), startTime: '15:00', endTime: '22:00', revenueTarget: 1400 }
        ],
        expenses: [{ description: 'Aluguer da barraca', type: 'Fixa', amount: 750 }]
    });
    await gestor.put(`/api/events/${next.eventId}/previous`, { previousEventId: current.eventId });
    await gestor.post(`/api/events/${next.eventId}/menu/copy`, { fromEventId: current.eventId });
    step('"Feira de Natal": próximo evento, pronto para a previsão de compras');

    // 6. Evento só com valores: Concerto Solidário (sem controlo de stock)
    const concert = await createEvent({
        eventName: 'Concerto Solidário',
        location: 'Auditório Municipal, Gaia',
        spaceType: 'Interior',
        expectedAudience: 600,
        trackStock: false,
        days: [{ date: day(-9), startTime: '21:00', endTime: '01:00', revenueTarget: 900 }],
        expenses: [{ description: 'Montagem do bar', type: 'Fixa', amount: 150 }]
    });
    const concertDay = concert.days[0].event_day_id;

    for (const [itemName, category, price] of [['Imperial', 'Bebidas', 1.5], ['Sangria', 'Cocktails', 4], ['Prego no pão', 'Comida', 4]]) {
        await gestor.post(`/api/events/${concert.eventId}/menu`, { itemName, category, price, itemType: 'Direta', products: [] });
    }

    const concertIds = await menuIds(concert.eventId);
    await colab.post(`/api/events/${concert.eventId}/sales`, {
        eventDayId: concertDay,
        lines: [{ menuItemId: concertIds.Imperial, quantity: 180 }, { menuItemId: concertIds.Sangria, quantity: 45 }, { menuItemId: concertIds['Prego no pão'], quantity: 60 }]
    });
    await gestor.post(`/api/events/${concert.eventId}/sales/totals`, { eventDayId: concertDay, amount: 215, note: 'Caixa do bar 2 (só o total)' });
    await gestor.post(`/api/events/${concert.eventId}/invoices`, { supplierName: 'Distribuidora do Norte (demo)', invoiceDate: day(-10), description: 'Bebidas', amount: 290 });
    await gestor.post(`/api/events/${concert.eventId}/invoices`, { supplierName: 'Padaria Lusa (demo)', invoiceDate: day(-9), description: 'Pão e carne', amount: 95 });
    await gestor.post(`/api/events/${concert.eventId}/days/${concertDay}/close`);
    step('"Concerto Solidário": evento só com valores (faturas, faturação em euros e despesas)');

    console.log('\nPronto! Entra com:');
    Object.entries(EMAILS).forEach(([role, email]) => console.log(`  ${role.padEnd(13)} ${email}`));
    console.log('  (a palavra-passe é a que escreveste)\n');
}

main().catch((error) => {
    console.error(`\nParou com um erro: ${error.message}`);
    console.error('Se a marca já existir, usa outro nome com --marca "Outro nome" ou entra com as contas que já criaste.\n');
    process.exit(1);
});
