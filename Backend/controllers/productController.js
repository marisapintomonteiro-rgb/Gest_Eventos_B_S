// controllers/productController.js: produtos da marca e histórico de preços (RF07, RF11, só Gestor e Administrador).

const productModel = require('../models/productModel');
const supplierModel = require('../models/supplierModel');

const UNITS = ['unidade', 'grama', 'mililitro'];

// Campo numérico opcional: vazio passa a null; caso contrário, transforma em número
function toOptionalNumber(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return Number(value);
}

function isPositiveNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

// Confirma os dados do produto. Devolve a mensagem do primeiro erro, ou null se estiver tudo certo.
function validateProduct(product, suppliers) {
    if (product.productName.length === 0 || product.productName.length > 100) {
        return 'Indica o nome do produto (até 100 caracteres).';
    }

    if (!UNITS.includes(product.unit)) {
        return 'A unidade tem de ser unidade, grama ou mililitro.';
    }

    if (!isPositiveNumber(product.packageQuantity)) {
        return 'Indica quanto tem cada embalagem (maior do que zero).';
    }

    if (product.minStock !== null && (Number.isNaN(product.minStock) || product.minStock < 0)) {
        return 'O stock mínimo tem de ser um valor sem negativos.';
    }

    const supplierIds = suppliers.map((supplier) => supplier.supplierId);

    if (new Set(supplierIds).size !== supplierIds.length) {
        return 'Cada fornecedor só pode aparecer uma vez no mesmo produto.';
    }

    if (suppliers.filter((supplier) => supplier.isMain).length > 1) {
        return 'Um produto só pode ter um fornecedor principal.';
    }

    for (const supplier of suppliers) {
        if (supplier.packagePrice !== null && !isPositiveNumber(supplier.packagePrice)) {
            return 'Os preços têm de ser maiores do que zero.';
        }
    }

    return null;
}

// GET /api/products: lista os produtos da marca, com os fornecedores e o preço mais recente
async function listProducts(req, res) {
    try {
        const products = await productModel.findProductsByBrand(req.session.user.brandId);
        res.json({ products });
    } catch (error) {
        console.error('Erro ao listar os produtos:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar os produtos. Tenta novamente.' });
    }
}

// Lê os dados do produto e a lista de fornecedores que vieram no pedido
function readProduct(body) {
    const product = {
        productName: String(body.productName || '').trim(),
        unit: String(body.unit || ''),
        packageQuantity: Number(body.packageQuantity),
        minStock: toOptionalNumber(body.minStock),
        isPerishable: body.isPerishable ? 1 : 0,
        isResidual: body.isResidual ? 1 : 0
    };

    const suppliers = (Array.isArray(body.suppliers) ? body.suppliers : []).map((supplier) => ({
        supplierId: Number(supplier.supplierId),
        isMain: supplier.isMain ? 1 : 0,
        packagePrice: toOptionalNumber(supplier.packagePrice)
    }));

    return { product, suppliers };
}

// Confirma as regras que precisam da base de dados: nome repetido e fornecedores de outra marca
async function checkProductInDatabase(brandId, product, suppliers, exceptProductId = 0) {
    if (await productModel.findProductByName(brandId, product.productName, exceptProductId)) {
        return 'Já existe um produto com este nome.';
    }

    const supplierIds = suppliers.map((supplier) => supplier.supplierId);
    const brandSupplierIds = await supplierModel.findSupplierIdsOfBrand(brandId, supplierIds);

    if (brandSupplierIds.length !== supplierIds.length) {
        return 'Um dos fornecedores escolhidos não existe nesta marca.';
    }

    return null;
}

// POST /api/products: cria um produto com os seus fornecedores e o primeiro preço de cada um
async function createProduct(req, res) {
    const { brandId, userId } = req.session.user;
    const { product, suppliers } = readProduct(req.body);
    const errorMessage = validateProduct(product, suppliers);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const databaseError = await checkProductInDatabase(brandId, product, suppliers);

        if (databaseError) {
            return res.status(400).json({ error: databaseError });
        }

        const productId = await productModel.createProduct(brandId, userId, product, suppliers);
        res.status(201).json({ productId, message: `Produto "${product.productName}" criado.` });
    } catch (error) {
        console.error('Erro ao criar o produto:', error.message);
        res.status(500).json({ error: 'Não foi possível criar o produto. Tenta novamente.' });
    }
}

// PUT /api/products/:id: altera o produto. Os preços não mudam aqui: usa-se "Novo preço" (histórico).
async function updateProduct(req, res) {
    const { brandId, userId } = req.session.user;
    const productId = Number(req.params.id);
    const { product, suppliers } = readProduct(req.body);
    const errorMessage = validateProduct(product, suppliers);

    if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
    }

    try {
        if (!await productModel.findProductById(brandId, productId)) {
            return res.status(404).json({ error: 'Este produto não existe.' });
        }

        const databaseError = await checkProductInDatabase(brandId, product, suppliers, productId);

        if (databaseError) {
            return res.status(400).json({ error: databaseError });
        }

        await productModel.updateProduct(productId, userId, product, suppliers);
        res.json({ message: `Produto "${product.productName}" alterado.` });
    } catch (error) {
        console.error('Erro ao alterar o produto:', error.message);
        res.status(500).json({ error: 'Não foi possível alterar o produto. Tenta novamente.' });
    }
}

// POST /api/products/:id/prices: regista um preço novo; o anterior fica no histórico
async function addPrice(req, res) {
    const productId = Number(req.params.id);
    const supplierId = Number(req.body.supplierId);
    const packagePrice = Number(req.body.packagePrice);
    const { brandId, userId } = req.session.user;

    if (!isPositiveNumber(packagePrice)) {
        return res.status(400).json({ error: 'O preço tem de ser maior do que zero.' });
    }

    try {
        if (!await productModel.findProductSupplierLink(brandId, productId, supplierId)) {
            return res.status(404).json({ error: 'Este fornecedor não está ligado a este produto.' });
        }

        await productModel.addPrice(productId, supplierId, packagePrice, userId);
        res.status(201).json({ message: 'Preço registado. O preço anterior ficou no histórico.' });
    } catch (error) {
        console.error('Erro ao registar o preço:', error.message);
        res.status(500).json({ error: 'Não foi possível registar o preço. Tenta novamente.' });
    }
}

// GET /api/products/:id/prices: histórico de preços de um produto
async function listPrices(req, res) {
    try {
        const prices = await productModel.findPriceHistory(req.session.user.brandId, Number(req.params.id));
        res.json({ prices });
    } catch (error) {
        console.error('Erro ao ler o histórico de preços:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar o histórico de preços. Tenta novamente.' });
    }
}

module.exports = { listProducts, createProduct, updateProduct, addPrice, listPrices };
