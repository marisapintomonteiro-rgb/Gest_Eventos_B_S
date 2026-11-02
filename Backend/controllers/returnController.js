// controllers/returnController.js: devoluções a fornecedores (RF22, só Gestor e Administrador).
// Regras: o fornecedor tem de aceitar devoluções; só embalagens fechadas (números inteiros);
// o sistema sugere quantas se podem devolver, mas quem regista confirma a quantidade real.

const returnModel = require('../models/returnModel');
const eventModel = require('../models/eventModel');
const stockModel = require('../models/stockModel');

// Data no formato AAAA-MM-DD e que existe mesmo no calendário
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return false;
    }

    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

// Confirma que o evento do endereço pertence à marca de quem tem a sessão
async function findEvent(req) {
    return eventModel.findEventById(req.session.user.brandId, Number(req.params.eventId));
}

// Junta a cada linha a sugestão: embalagens fechadas que ainda há em stock,
// sem passar do que foi comprado a esse fornecedor menos o que já foi devolvido
function addSuggestions(lines, stock) {
    return lines.map((line) => {
        const row = stock.find((item) => item.product_id === line.product_id);
        const inStock = row ? Math.max(Number(row.quantity), 0) : 0;
        const closedPackages = Math.floor(inStock / Number(line.package_quantity));
        const stillReturnable = Number(line.packages_bought) - Number(line.packages_returned);

        return {
            supplierId: line.supplier_id,
            supplierName: line.supplier_name,
            productId: line.product_id,
            productName: line.product_name,
            unit: line.unit,
            packageQuantity: Number(line.package_quantity),
            packagesBought: Number(line.packages_bought),
            packagesReturned: Number(line.packages_returned),
            averagePrice: Math.round(Number(line.average_price) * 100) / 100,
            suggested: Math.max(0, Math.min(closedPackages, Math.floor(stillReturnable)))
        };
    });
}

// GET /api/events/:eventId/returns: devoluções feitas e o que ainda se pode devolver
async function listReturns(req, res) {
    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        const [returns, lines, stock] = await Promise.all([
            returnModel.findReturnsByEvent(event.event_id),
            returnModel.findReturnableLines(event.event_id),
            stockModel.findStockByEvent(event.event_id)
        ]);

        res.json({ returns, returnable: addSuggestions(lines, stock) });
    } catch (error) {
        console.error('Erro ao listar as devoluções:', error.message);
        res.status(500).json({ error: 'Não foi possível carregar as devoluções. Tenta novamente.' });
    }
}

// POST /api/events/:eventId/returns: registar uma devolução confirmada pelo utilizador
async function createReturn(req, res) {
    const supplierId = Number(req.body.supplierId);
    const productId = Number(req.body.productId);
    const packages = Number(req.body.packages);
    const packagePrice = Number(req.body.packagePrice);
    const returnDate = String(req.body.returnDate || '');

    if (!Number.isInteger(packages) || packages <= 0) {
        return res.status(400).json({ error: 'Só se devolvem embalagens fechadas: indica um número inteiro maior do que zero.' });
    }

    if (Number.isNaN(packagePrice) || packagePrice <= 0) {
        return res.status(400).json({ error: 'O valor devolvido por embalagem tem de ser maior do que zero.' });
    }

    if (!isValidDate(returnDate)) {
        return res.status(400).json({ error: 'Indica a data da devolução.' });
    }

    try {
        const event = await findEvent(req);

        if (!event) {
            return res.status(404).json({ error: 'Este evento não existe.' });
        }

        // Só aparece aqui o que foi comprado neste evento a fornecedores que aceitam devoluções
        const lines = await returnModel.findReturnableLines(event.event_id);
        const line = lines.find((item) => item.supplier_id === supplierId && item.product_id === productId);

        if (!line) {
            return res.status(400).json({ error: 'Este fornecedor não aceita devoluções ou este produto não lhe foi comprado neste evento.' });
        }

        const stillReturnable = Number(line.packages_bought) - Number(line.packages_returned);

        if (packages > stillReturnable) {
            return res.status(400).json({ error: `Só se podem devolver mais ${stillReturnable} embalagens deste produto a este fornecedor.` });
        }

        await returnModel.createReturn(event.event_id, req.session.user.userId, {
            supplierId,
            supplierName: line.supplier_name,
            productId,
            packages,
            packageQuantity: Number(line.package_quantity),
            packagePrice,
            returnDate
        });

        res.status(201).json({ message: 'Devolução registada. O stock e o resultado foram atualizados.' });
    } catch (error) {
        console.error('Erro ao registar a devolução:', error.message);
        res.status(500).json({ error: 'Não foi possível registar a devolução. Tenta novamente.' });
    }
}

// DELETE /api/events/:eventId/returns/:returnId: apagar uma devolução registada por engano
async function deleteReturn(req, res) {
    try {
        const event = await findEvent(req);
        const itemReturn = event ? await returnModel.findReturnInEvent(event.event_id, Number(req.params.returnId)) : null;

        if (!itemReturn) {
            return res.status(404).json({ error: 'Esta devolução não existe.' });
        }

        await returnModel.deleteReturn(itemReturn.return_id, itemReturn.movement_id);
        res.json({ message: 'Devolução apagada. As embalagens voltaram ao stock.' });
    } catch (error) {
        console.error('Erro ao apagar a devolução:', error.message);
        res.status(500).json({ error: 'Não foi possível apagar a devolução. Tenta novamente.' });
    }
}

module.exports = { listReturns, createReturn, deleteReturn };
