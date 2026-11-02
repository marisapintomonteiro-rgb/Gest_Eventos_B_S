// controllers/forecastController.js: previsão de compras (RF13, só Gestor e Administrador).
// Fórmula (aprovada pela equipa): para cada produto,
//   sugestão = o que se gastou na edição anterior x (1 + margem de segurança / 100),
//   arredondada para cima em embalagens. O utilizador pode sempre ajustar as quantidades.
// Se não houver edição anterior (ou histórico), as quantidades introduzem-se à mão.

const eventModel = require('../models/eventModel');
const stockModel = require('../models/stockModel');
const purchaseModel = require('../models/purchaseModel');
const productModel = require('../models/productModel');

const DEFAULT_MARGIN = 10;

function readMargin(value) {
    if (value === undefined || value === '') {
        return DEFAULT_MARGIN;
    }

    return Number(value);
}

// GET /api/events/:eventId/forecast?margin=10
async function getForecast(req, res) {
    const brandId = req.session.user.brandId;
    const margin = readMargin(req.query.margin);

    if (Number.isNaN(margin) || margin < 0 || margin > 200) {
        return res.status(400).json({ error: 'A margem de segurança tem de estar entre 0% e 200%.' });
    }

    try {
        const event = await eventModel.findEventById(brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const previous = await eventModel.findPreviousEvent(event.event_id);

        if (!previous) {
            return res.json({ previous: null, margin, lines: [] });
        }

        const [consumption, boughtNow, products] = await Promise.all([
            stockModel.findConsumptionByEvent(previous.event_id),
            purchaseModel.findPurchaseCostByProduct(event.event_id),
            productModel.findProductsByBrand(brandId)
        ]);

        const lines = consumption.map((row) => {
            const packageQuantity = Number(row.package_quantity);
            const consumed = Number(row.consumed);
            const suggestedQuantity = consumed * (1 + margin / 100);
            const suggestedPackages = Math.ceil(suggestedQuantity / packageQuantity);

            // O que já foi comprado para este evento conta para a sugestão
            const bought = boughtNow.find((item) => item.product_id === row.product_id);
            const boughtPackages = bought ? Number(bought.quantity) / packageQuantity : 0;

            // Fornecedor principal e o seu preço mais recente (para estimar o custo)
            const product = products.find((item) => item.product_id === row.product_id);
            const main = product ? (product.suppliers.find((link) => link.is_main) || product.suppliers[0]) : null;

            return {
                productId: row.product_id,
                productName: row.product_name,
                unit: row.unit,
                packageQuantity,
                consumed,
                suggestedQuantity: Math.round(suggestedQuantity * 100) / 100,
                suggestedPackages,
                boughtPackages: Math.round(boughtPackages * 100) / 100,
                toBuy: Math.max(0, Math.ceil(suggestedPackages - boughtPackages)),
                supplierId: main ? main.supplier_id : null,
                supplierName: main ? main.supplier_name : null,
                packagePrice: main && main.latest_price !== null ? Number(main.latest_price) : null
            };
        });

        res.json({ previous, margin, lines });
    } catch (error) {
        console.error('Erro ao calcular a previsão:', error.message);
        res.status(500).json({ error: 'Não foi possível calcular a previsão. Tenta novamente.' });
    }
}

// PUT /api/events/:eventId/previous: definir a edição anterior (ou tirar, com previousEventId vazio)
async function setPreviousEvent(req, res) {
    const brandId = req.session.user.brandId;
    const hasPrevious = req.body.previousEventId !== undefined && req.body.previousEventId !== null && req.body.previousEventId !== '';

    try {
        const event = await eventModel.findEventById(brandId, Number(req.params.eventId));

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        let previousId = null;

        if (hasPrevious) {
            const previous = await eventModel.findEventById(brandId, Number(req.body.previousEventId));

            if (!previous || previous.event_id === event.event_id) {
                return res.status(400).json({ error: 'Escolhe outro evento desta marca como edição anterior.' });
            }

            // A edição anterior tem de ter acontecido antes
            if (previous.first_day && event.first_day && previous.first_day >= event.first_day) {
                return res.status(400).json({ error: 'A edição anterior tem de ser um evento que aconteceu antes deste.' });
            }

            previousId = previous.event_id;
        }

        await eventModel.setPreviousEvent(event.event_id, previousId);
        res.json({ message: previousId ? 'Edição anterior guardada.' : 'Edição anterior retirada.' });
    } catch (error) {
        console.error('Erro ao guardar a edição anterior:', error.message);
        res.status(500).json({ error: 'Não foi possível guardar a edição anterior. Tenta novamente.' });
    }
}

module.exports = { getForecast, setPreviousEvent };
