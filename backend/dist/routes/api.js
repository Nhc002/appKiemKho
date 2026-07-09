import { Router } from 'express';
import { ProductRepository, IngredientRepository, RecipeRepository, InventoryRepository, SaleRepository, LogRepository, SupplierRepository } from '../repositories/db.repository.js';
import { FabiService } from '../services/fabi.service.js';
const router = Router();
// ==========================================
// 1. DASHBOARD ANALYTICS ENDPOINT
// ==========================================
router.get('/dashboard', async (req, res) => {
    try {
        const products = await ProductRepository.getAll();
        const ingredients = await IngredientRepository.getAll();
        const sales = await SaleRepository.getSales();
        const counts = await InventoryRepository.getCounts();
        const exportsList = await InventoryRepository.getExports();
        const todayStr = new Date().toISOString().substring(0, 10);
        // Today's statistics
        let todayRevenue = 0;
        let todayCogs = 0;
        sales.forEach(s => {
            // Check if sync date is today
            const dateStr = s.created_at ? s.created_at.substring(0, 10) : '';
            if (dateStr === todayStr) {
                todayRevenue += Number(s.total_revenue_net) || 0;
                todayCogs += Number(s.total_cogs) || 0;
            }
        });
        const todayProfit = todayRevenue - todayCogs;
        const todayFoodCostPct = todayRevenue > 0 ? (todayCogs / todayRevenue) * 100 : 0;
        // Total Inventory Value
        let inventoryValue = 0;
        ingredients.forEach(i => {
            inventoryValue += (Number(i.current_stock) || 0) * (Number(i.cost_price) || 0);
        });
        // Total Loss / Excess costs from counts
        let totalLoss = 0;
        let totalExcess = 0;
        counts.forEach(cnt => {
            cnt.items?.forEach(it => {
                const diffCost = Number(it.difference_cost) || 0;
                if (diffCost < 0)
                    totalLoss += Math.abs(diffCost);
                if (diffCost > 0)
                    totalExcess += diffCost;
            });
        });
        // Low stock warning list
        const lowStockAlerts = ingredients.filter(i => i.current_stock <= i.min_stock).map(i => ({
            id: i.id,
            name: i.name,
            stock: i.current_stock,
            min: i.min_stock,
            unit: i.unit
        }));
        // Top Selling Items (Aggregate all-time or last sales block)
        const productSoldMap = {};
        sales.forEach(s => {
            s.items?.forEach(it => {
                const prod = products.find(p => p.id === it.product_id);
                const name = prod ? prod.item_name : `Sản phẩm #${it.product_id}`;
                if (!productSoldMap[it.product_id]) {
                    productSoldMap[it.product_id] = { name, quantity: 0, revenue: 0 };
                }
                productSoldMap[it.product_id].quantity += it.quantity_sold;
                productSoldMap[it.product_id].revenue += it.revenue_net;
            });
        });
        const topSellingItems = Object.values(productSoldMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        // Top Ingredients Consumed (Calculate based on sales * recipes)
        const ingredientConsumedMap = {};
        const recipes = await RecipeRepository.getAll();
        sales.forEach(s => {
            s.items?.forEach(it => {
                const recipe = recipes.find(r => r.product_id === it.product_id && r.active);
                if (recipe && recipe.items) {
                    recipe.items.forEach(recItem => {
                        const ing = ingredients.find(i => i.id === recItem.ingredient_id);
                        if (ing) {
                            if (!ingredientConsumedMap[recItem.ingredient_id]) {
                                ingredientConsumedMap[recItem.ingredient_id] = {
                                    name: ing.name,
                                    quantity: 0,
                                    unit: ing.unit,
                                    cost: 0
                                };
                            }
                            const consumed = Number(recItem.quantity) * Number(it.quantity_sold);
                            ingredientConsumedMap[recItem.ingredient_id].quantity += consumed;
                            ingredientConsumedMap[recItem.ingredient_id].cost += consumed * ing.cost_price;
                        }
                    });
                }
            });
        });
        const topIngredientsConsumed = Object.values(ingredientConsumedMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        // Top Inventory Loss (Aggregate negative count differences per ingredient)
        const ingredientLossMap = {};
        counts.forEach(c => {
            c.items?.forEach(it => {
                if (it.difference < 0) {
                    const ing = ingredients.find(i => i.id === it.ingredient_id);
                    if (ing) {
                        if (!ingredientLossMap[it.ingredient_id]) {
                            ingredientLossMap[it.ingredient_id] = {
                                name: ing.name,
                                quantity: 0,
                                unit: ing.unit,
                                cost: 0
                            };
                        }
                        ingredientLossMap[it.ingredient_id].quantity += Math.abs(it.difference);
                        ingredientLossMap[it.ingredient_id].cost += Math.abs(it.difference_cost);
                    }
                }
            });
        });
        const topInventoryLoss = Object.values(ingredientLossMap)
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);
        res.json({
            today_revenue: todayRevenue,
            today_cogs: todayCogs,
            today_profit: todayProfit,
            today_food_cost_pct: todayFoodCostPct,
            inventory_value: inventoryValue,
            total_loss: totalLoss,
            total_excess: totalExcess,
            low_stock_alerts_count: lowStockAlerts.length,
            low_stock_alerts: lowStockAlerts,
            top_selling_items: topSellingItems,
            top_ingredients_consumed: topIngredientsConsumed,
            top_inventory_loss: topInventoryLoss
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 2. INGREDIENTS ENDPOINTS
// ==========================================
router.get('/ingredients', async (req, res) => {
    try {
        const data = await IngredientRepository.getAll();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/ingredients', async (req, res) => {
    try {
        const ing = await IngredientRepository.save(req.body);
        await LogRepository.add('Chỉnh sửa nguyên liệu', `Lưu thông tin nguyên liệu: ${ing.name} (Tồn hiện tại: ${ing.current_stock} ${ing.unit})`);
        res.json(ing);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/ingredients/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await IngredientRepository.delete(id);
        await LogRepository.add('Xóa nguyên liệu', `Xóa nguyên vật liệu ID #${id}`);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 3. PRODUCTS ENDPOINTS
// ==========================================
router.get('/products', async (req, res) => {
    try {
        const data = await ProductRepository.getAll();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 4. RECIPES (BOM) ENDPOINTS
// ==========================================
router.get('/recipes', async (req, res) => {
    try {
        const data = await RecipeRepository.getAll();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/recipes/:productId', async (req, res) => {
    try {
        const prodId = Number(req.params.productId);
        const data = await RecipeRepository.getByProductId(prodId);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/recipes', async (req, res) => {
    try {
        const { product_id, items } = req.body;
        if (!product_id) {
            return res.status(400).json({ error: 'Thiếu product_id' });
        }
        const newRecipe = await RecipeRepository.save(Number(product_id), items);
        const prod = (await ProductRepository.getAll()).find(p => p.id === Number(product_id));
        await LogRepository.add('Thiết lập định lượng', `Cấu hình công thức (BOM) cho món: ${prod ? prod.item_name : `#${product_id}`} với ${items.length} nguyên vật liệu.`);
        res.json(newRecipe);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 5. TRANSACTION HISTORIES & SUBMITS
// ==========================================
router.get('/imports', async (req, res) => {
    try {
        const data = await InventoryRepository.getImports();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/import', async (req, res) => {
    try {
        const { supplier_id, total_cost, note, user_id, items } = req.body;
        const newImport = await InventoryRepository.addImport({ supplier_id, total_cost, note, user_id }, items);
        res.json(newImport);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/exports', async (req, res) => {
    try {
        const data = await InventoryRepository.getExports();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/export', async (req, res) => {
    try {
        const { note, user_id, total_value, items } = req.body;
        const newExport = await InventoryRepository.addExport({ note, user_id, total_value }, items);
        res.json(newExport);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/counts', async (req, res) => {
    try {
        const data = await InventoryRepository.getCounts();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/inventory-count', async (req, res) => {
    try {
        const { user_id, total_difference_cost, note, items } = req.body;
        const newCount = await InventoryRepository.addCount({ user_id, total_difference_cost, note }, items);
        res.json(newCount);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 6. FABI IPOS SYNC TRIGGER
// ==========================================
router.post('/fabi/sync', async (req, res) => {
    try {
        const { start_date, end_date } = req.body;
        const result = await FabiService.syncSales(start_date, end_date);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 7. MISCELLANEOUS (LOGS, SUPPLIERS)
// ==========================================
router.get('/logs', async (req, res) => {
    try {
        const data = await LogRepository.getAll();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/suppliers', async (req, res) => {
    try {
        const data = await SupplierRepository.getAll();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
