// controllers/menuController.js: ementa de cada evento (RF08, RF09, RF10 e RF29).
// Todos os perfis consultam a ementa; só o Gestor e o Administrador a alteram.

const menuModel = require('../models/menuModel');
const eventModel = require('../models/eventModel');
const productModel = require('../models/productModel');
const saleModel = require('../models/saleModel');

const CATEGORIES = ['Bebidas', 'Cocktails', 'Comida', 'Shots', 'Outros'];
const ITEM_TYPES = ['Direta', 'Composta'];

// Campo numérico opcional: vazio passa a null; caso contrário, transforma em número
function toOptionalNumber(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return Number(value);
}

// Lê os dados do artigo e a lista "produto + quantidade" que vieram no pedido
function readItem(body) {
    const item = {
        itemName: String(body.itemName || '').trim(),
        category: String(body.category || ''),
        price: Number(body.price),
        itemType: String(body.itemType || '')
    };

    const products = (Array.isArray(body.products) ? body.products : []).map((product) => ({
        productId: Number(product.productId),
        quantity: toOptionalNumber(product.quantity)
    }));

    return { item, products };
}

// Confirma os dados do artigo. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
function validateItem(item, products) {
    if (item.itemName.length === 0 || item.itemName.length > 100) {
        return 'Indica o nome do artigo (até 100 caracteres).';
    }

    if (!CATEGORIES.includes(item.category)) {
        return 'Escolhe a categoria: bebidas, cocktails, comida, shots ou outros.';
    }

    if (Number.isNaN(item.price) || item.price <= 0) {
        return 'O preço de venda tem de ser maior do que zero.';
    }

    if (!ITEM_TYPES.includes(item.itemType)) {
        return 'O tipo tem de ser venda direta ou artigo composto.';
    }

    if (item.itemType === 'Direta' && products.length !== 1) {
        return 'Um artigo de venda direta usa um só produto.';
    }

    if (item.itemType === 'Composta' && products.length === 0) {
        return 'Indica os produtos da receita.';
    }

    const productIds = products.map((product) => product.productId);

    if (new Set(productIds).size !== productIds.length) {
        return 'Cada produto só pode aparecer uma vez no mesmo artigo.';
    }

    for (const product of products) {
        if (product.quantity !== null && (Number.isNaN(product.quantity) || product.quantity <= 0)) {
            return 'As quantidades têm de ser maiores do que zero.';
        }
    }

    return null;
}

// Confirma que os produtos são da marca e que só os de consumo residual ficam sem quantidade
async function checkProducts(brandId, products) {
    const brandProducts = await productModel.findProductsOfBrand(brandId, products.map((product) => product.productId));

    if (brandProducts.length !== products.length) {
        return 'Um dos produtos escolhidos não existe nesta marca.';
    }

    for (const product of products) {
        const found = brandProducts.find((row) => row.product_id === product.productId);

        if (product.quantity === null && !found.is_residual) {
            return 'Indica a quantidade de cada produto (só os de consumo residual podem ficar sem quantidade).';
        }
    }

    return null;
}

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// GET /api/events/:eventId/menu: consultar a ementa (todos os perfis, RF29)
async function getMenu(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        let items = await menuModel.findMenuByEvent(event.event_id);

        // O Colaborador vê os artigos e os preços (RF29); a composição é para quem gere
        if (req.session.user.role === 'Colaborador') {
            items = items.map(({ products, ...item }) => item);
        }

        res.json({ event, items });
    } catch (error) {
        console.error('Erro ao ler a ementa:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar a ementa. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/menu: acrescentar um artigo à ementa
async function createItem(req, res) {
    const { item, products } = readItem(req.body);
    const errorMessage = validateItem(item, products);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        if (await menuModel.findItemByName(event.event_id, item.itemName)) {
            return res.status(400).json({ error: 'Já existe um artigo com este nome nesta ementa.' });
        }

        const productError = await checkProducts(req.session.user.brandId, products);

        if (productError) {
            return res.status(400).json({ error: productError });
        }

        const itemId = await menuModel.createItem(event.event_id, item, products);
        res.status(201).json({ itemId, message: `Artigo "${item.itemName}" acrescentado à ementa.` });
    } catch (error) {
        console.error('Erro ao criar o artigo:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o artigo. Tenta novamente.' });
    }
}

// PUT /api/events/:eventId/menu/:itemId: alterar um artigo
async function updateItem(req, res) {
    const itemId = Number(req.params.itemId);
    const { item, products } = readItem(req.body);
    const errorMessage = validateItem(item, products);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const event = await findEvent(req);

        if (!event || !await menuModel.findItemInEvent(event.event_id, itemId)) {
            return res.status(404).json({ error: 'Este artigo não existe.' });
        }

        if (await menuModel.findItemByName(event.event_id, item.itemName, itemId)) {
            return res.status(400).json({ error: 'Já existe um artigo com este nome nesta ementa.' });
        }

        const productError = await checkProducts(req.session.user.brandId, products);

        if (productError) {
            return res.status(400).json({ error: productError });
        }

        await menuModel.updateItem(itemId, item, products);
        res.json({ message: `Artigo "${item.itemName}" alterado.` });
    } catch (error) {
        console.error('Erro ao alterar o artigo:', error.message);
        res.status(500).json({ error: 'Não foi possível alterar o artigo. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/menu/:itemId: tirar um artigo da ementa
async function deleteItem(req, res) {
    const itemId = Number(req.params.itemId);

    try {
        const event = await findEvent(req);

        if (!event || !await menuModel.findItemInEvent(event.event_id, itemId)) {
            return res.status(404).json({ error: 'Este artigo não existe.' });
        }

        // Um artigo já vendido fica na ementa: as vendas apontam para ele (histórico)
        if (await saleModel.itemHasSales(itemId)) {
            return res.status(400).json({ error: 'Este artigo já tem vendas e não pode ser retirado. Podes mudar o preço ou o nome.' });
        }

        await menuModel.deleteItem(itemId);
        res.json({ message: 'Artigo retirado da ementa.' });
    } catch (error) {
        console.error('Erro ao apagar o artigo:', error.message);
        res.status(500).json({ error: 'Não foi possível retirar o artigo. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/menu/copy: copiar a ementa de outro evento da marca (RF10)
async function copyMenu(req, res) {
    const brandId = req.session.user.brandId;
    const fromEventId = Number(req.body.fromEventId);

    try {
        const event = await findEvent(req);
        const sourceEvent = await eventModel.findEventById(brandId, fromEventId);

        if (!event || !sourceEvent) {
            return res.status(404).json({ error: 'Um dos eventos não existe.' });
        }

        if (event.event_id === sourceEvent.event_id) {
            return res.status(400).json({ error: 'Escolhe um evento diferente deste.' });
        }

        const result = await menuModel.copyMenu(sourceEvent.event_id, event.event_id);
        let message = `Copiados ${result.copied} artigos de "${sourceEvent.event_name}".`;

        if (result.skipped > 0) {
            message += ` ${result.skipped} já existiam nesta ementa e ficaram como estavam.`;
        }

        res.status(201).json({ ...result, message });
    } catch (error) {
        console.error('Erro ao copiar a ementa:', error.message);
        res.status(500).json({ error: 'Não foi possível copiar a ementa. Tenta novamente.' });
    }
}

module.exports = { getMenu, createItem, updateItem, deleteItem, copyMenu };
