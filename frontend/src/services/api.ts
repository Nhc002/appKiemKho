import axios from 'axios';
import { db } from '../db.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log(`[API Client] Kết nối backend tại: ${API_BASE_URL}`);

// Create custom axios instance
// Timeout cao hơn cho cloud deployment (Render free tier có cold start ~30s)
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

// Flag indicating if we are using the backend API or falling back to IndexedDB
let isOfflineMode = false;

export const ApiService = {
  isOffline() {
    return isOfflineMode;
  },

  setOffline(offline) {
    isOfflineMode = offline;
    console.log(`[API Client] Đang ở chế độ: ${offline ? 'NGOẠI TUYẾN (IndexedDB)' : 'TRỰC TUYẾN (Express)'}`);
  },

  // Helper to wrap API calls with automatic offline fallback
  async request(apiCall, fallbackCall) {
    if (isOfflineMode) {
      return await fallbackCall();
    }
    try {
      const response = await apiCall();
      return response.data;
    } catch (err: any) {
      // If it's a network error (backend down), switch to offline mode and run fallback
      if (!err.response || err.code === 'ERR_NETWORK') {
        this.setOffline(true);
        return await fallbackCall();
      }
      throw err;
    }
  },

  // ==========================================
  // 1. DASHBOARD DATA
  // ==========================================
  async getDashboard() {
    return this.request(
      () => client.get('/dashboard'),
      async () => {
        // Fallback calculations using browser IndexedDB
        const products = await db.products.toArray();
        const ingredients = await db.ingredients.toArray();
        const sales = await db.sales.toArray();
        const counts = await db.counts.toArray();
        
        const todayStr = new Date().toISOString().substring(0, 10);
        
        let todayRevenue = 0;
        let todayCogs = 0;
        
        sales.forEach(s => {
          const dateStr = s.created_at ? s.created_at.substring(0, 10) : '';
          if (dateStr === todayStr) {
            todayRevenue += Number(s.total_revenue_net) || 0;
            todayCogs += Number(s.total_cogs) || 0;
          }
        });

        const todayProfit = todayRevenue - todayCogs;
        const todayFoodCostPct = todayRevenue > 0 ? (todayCogs / todayRevenue) * 100 : 0;

        let inventoryValue = 0;
        ingredients.forEach(i => {
          inventoryValue += (Number(i.current_stock) || 0) * (Number(i.cost_price) || 0);
        });

        let totalLoss = 0;
        let totalExcess = 0;
        for (const cnt of counts) {
          // get details from count_items where count_id = cnt.id
          const items = await db.count_items.where('count_id').equals(cnt.id).toArray();
          items.forEach(it => {
            const diffCost = Number(it.difference_cost) || 0;
            if (diffCost < 0) totalLoss += Math.abs(diffCost);
            if (diffCost > 0) totalExcess += diffCost;
          });
        }

        const lowStockAlerts = ingredients.filter(i => i.current_stock <= i.min_stock).map(i => ({
          id: i.id,
          name: i.name,
          stock: i.current_stock,
          min: i.min_stock,
          unit: i.unit
        }));

        // Top Selling
        const productSoldMap: Record<number, { name: string; quantity: number; revenue: number }> = {};
        for (const s of sales) {
          const items = await db.sale_items.where('sale_id').equals(s.id).toArray();
          items.forEach(it => {
            const prod = products.find(p => p.id === it.product_id);
            const name = prod ? prod.item_name : `Sản phẩm #${it.product_id}`;
            if (!productSoldMap[it.product_id]) {
              productSoldMap[it.product_id] = { name, quantity: 0, revenue: 0 };
            }
            productSoldMap[it.product_id].quantity += it.quantity_sold;
            productSoldMap[it.product_id].revenue += it.revenue_net;
          });
        }

        const topSellingItems = Object.values(productSoldMap)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        // Top Ingredients
        const ingredientConsumedMap: Record<number, { name: string; quantity: number; unit: string; cost: number }> = {};
        const recipes = await db.recipes.toArray();
        const recipeItems = await db.recipe_items.toArray();

        for (const s of sales) {
          const items = await db.sale_items.where('sale_id').equals(s.id).toArray();
          for (const it of items) {
            const recipe = recipes.find(r => r.product_id === it.product_id && r.active);
            if (recipe) {
              const rItems = recipeItems.filter(ri => ri.recipe_id === recipe.id);
              rItems.forEach(recItem => {
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
          }
        }

        const topIngredientsConsumed = Object.values(ingredientConsumedMap)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        return {
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
          top_inventory_loss: []
        };
      }
    );
  },

  // ==========================================
  // 2. INGREDIENTS
  // ==========================================
  async getIngredients() {
    return this.request(
      () => client.get('/ingredients'),
      () => db.ingredients.toArray()
    );
  },

  async saveIngredient(ing) {
    return this.request(
      () => client.post('/ingredients', ing),
      async () => {
        if (!ing.id) {
          ing.id = Date.now();
          ing.created_at = new Date().toISOString();
        }
        await db.ingredients.put(ing);
        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Nhân viên (Offline)',
          action: 'Chỉnh sửa nguyên liệu',
          details: `Lưu nguyên liệu: ${ing.name} (Tồn hiện tại: ${ing.current_stock} ${ing.unit})`
        });
        return ing;
      }
    );
  },

  async deleteIngredient(id) {
    return this.request(
      () => client.delete(`/ingredients/${id}`),
      async () => {
        await db.ingredients.delete(id);
        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Nhân viên (Offline)',
          action: 'Xóa nguyên liệu',
          details: `Xóa nguyên vật liệu ID #${id}`
        });
        return { success: true };
      }
    );
  },

  // ==========================================
  // 3. PRODUCTS
  // ==========================================
  async getProducts() {
    return this.request(
      () => client.get('/products'),
      () => db.products.toArray()
    );
  },

  // ==========================================
  // 4. RECIPES (BOM)
  // ==========================================
  async getRecipes() {
    return this.request(
      () => client.get('/recipes'),
      async () => {
        const recipes = await db.recipes.toArray();
        const items = await db.recipe_items.toArray();
        return recipes.map(r => ({
          ...r,
          items: items.filter(it => it.recipe_id === r.id)
        }));
      }
    );
  },

  async saveRecipe(productId, items) {
    return this.request(
      () => client.post('/recipes', { product_id: productId, items }),
      async () => {
        // Set old recipes inactive in Dexie
        await db.recipes.where('product_id').equals(productId).modify({ active: false });
        
        const newId = Date.now();
        const newRecipe = {
          id: newId,
          product_id: productId,
          version: 1,
          active: true,
          created_at: new Date().toISOString()
        };
        await db.recipes.add(newRecipe);

        // Delete old recipe items for safety (if version 1 overwrite) or just add new items
        const itemsToInsert = items.map((it, idx) => ({
          id: Date.now() + idx,
          recipe_id: newId,
          ingredient_id: it.ingredient_id,
          quantity: it.quantity,
          created_at: new Date().toISOString()
        }));
        await db.recipe_items.bulkAdd(itemsToInsert);

        // Update product state
        await db.products.update(productId, { recipe_missing: items.length === 0 });

        const prod = await db.products.get(productId);
        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Quản lý (Offline)',
          action: 'Thiết lập định lượng',
          details: `Cấu hình công thức cho món: ${prod ? prod.item_name : `#${productId}`} với ${items.length} nguyên vật liệu.`
        });

        return newRecipe;
      }
    );
  },

  // ==========================================
  // 5. INVENTORY TRANSACTIONS
  // ==========================================
  async getImports() {
    return this.request(
      () => client.get('/imports'),
      async () => {
        const list = await db.imports.toArray();
        const items = await db.import_items.toArray();
        return list.map(i => ({
          ...i,
          items: items.filter(it => it.import_id === i.id)
        })).reverse();
      }
    );
  },

  async createImport(data) {
    return this.request(
      () => client.post('/import', data),
      async () => {
        const importId = Date.now();
        const newImport = {
          id: importId,
          supplier_id: data.supplier_id,
          total_cost: data.total_cost,
          note: data.note,
          user_id: data.user_id,
          created_at: new Date().toISOString()
        };
        await db.imports.add(newImport);

        const itemsToInsert = data.items.map((it, idx) => ({
          id: Date.now() + idx,
          import_id: importId,
          ingredient_id: it.ingredient_id,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          total_cost: it.total_cost
        }));
        await db.import_items.bulkAdd(itemsToInsert);

        // Update ingredient stocks
        for (const it of data.items) {
          const ing = await db.ingredients.get(it.ingredient_id);
          if (ing) {
            const newStock = Number(ing.current_stock) + Number(it.quantity);
            await db.ingredients.update(it.ingredient_id, { current_stock: newStock, cost_price: it.unit_cost });
          }
        }

        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Nhân viên (Offline)',
          action: 'Nhập kho',
          details: `Tạo phiếu nhập ${importId} gồm ${data.items.length} sản phẩm, tổng chi: ${data.total_cost.toLocaleString('vi-VN')}₫`
        });

        return newImport;
      }
    );
  },

  async getExports() {
    return this.request(
      () => client.get('/exports'),
      async () => {
        const list = await db.exports.toArray();
        const items = await db.export_items.toArray();
        return list.map(e => ({
          ...e,
          items: items.filter(it => it.export_id === e.id)
        })).reverse();
      }
    );
  },

  async createExport(data) {
    return this.request(
      () => client.post('/export', data),
      async () => {
        const exportId = Date.now();
        const newExport = {
          id: exportId,
          note: data.note,
          user_id: data.user_id,
          total_value: data.total_value,
          created_at: new Date().toISOString()
        };
        await db.exports.add(newExport);

        const itemsToInsert = data.items.map((it, idx) => ({
          id: Date.now() + idx,
          export_id: exportId,
          ingredient_id: it.ingredient_id,
          quantity: it.quantity,
          reason: it.reason,
          unit_cost: it.unit_cost,
          total_cost: it.total_cost
        }));
        await db.export_items.bulkAdd(itemsToInsert);

        // Deduct ingredient stocks
        for (const it of data.items) {
          const ing = await db.ingredients.get(it.ingredient_id);
          if (ing) {
            const newStock = Number(ing.current_stock) - Number(it.quantity);
            await db.ingredients.update(it.ingredient_id, { current_stock: newStock });
          }
        }

        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Nhân viên (Offline)',
          action: 'Xuất kho',
          details: `Tạo phiếu xuất ${exportId} gồm ${data.items.length} sản phẩm`
        });

        return newExport;
      }
    );
  },

  async getCounts() {
    return this.request(
      () => client.get('/counts'),
      async () => {
        const list = await db.counts.toArray();
        const items = await db.count_items.toArray();
        return list.map(c => ({
          ...c,
          items: items.filter(it => it.count_id === c.id)
        })).reverse();
      }
    );
  },

  async createCount(data) {
    return this.request(
      () => client.post('/inventory-count', data),
      async () => {
        const countId = Date.now();
        const dateStr = new Date().toISOString();
        const newCount = {
          id: countId,
          date: dateStr,
          user_id: data.user_id,
          total_difference_cost: data.total_difference_cost,
          note: data.note,
          created_at: dateStr
        };
        await db.counts.add(newCount);

        const itemsToInsert = data.items.map((it, idx) => ({
          id: Date.now() + idx,
          count_id: countId,
          ingredient_id: it.ingredient_id,
          expected_stock: it.expected_stock,
          actual_stock: it.actual_stock,
          difference: it.difference,
          difference_cost: it.difference_cost
        }));
        await db.count_items.bulkAdd(itemsToInsert);

        // Sync ingredient stocks to the actual counted stock
        for (const it of data.items) {
          await db.ingredients.update(it.ingredient_id, { current_stock: it.actual_stock });
        }

        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Nhân viên (Offline)',
          action: 'Kiểm kho',
          details: `Hoàn tất kiểm kho phiếu #${countId}, tổng chênh lệch: ${data.total_difference_cost.toLocaleString('vi-VN')}₫`
        });

        return newCount;
      }
    );
  },

  // ==========================================
  // 6. FABI IPOS SYNC
  // ==========================================
  async syncFabi(dates) {
    return this.request(
      () => client.post('/fabi/sync', dates),
      async () => {
        // Offline Mock Sync Generator!
        const products = await db.products.toArray();
        const ingredients = await db.ingredients.toArray();
        const recipes = await db.recipes.toArray();
        const recipeItems = await db.recipe_items.toArray();

        // 1. Generate mock quantities sold
        const qty1 = Math.floor(Math.random() * 20) + 15; // Trà sữa
        const qty2 = Math.floor(Math.random() * 15) + 10; // Trà đào
        const qty3 = Math.floor(Math.random() * 10) + 5;  // Món mới

        const mockSyncData = [
          { item_id: 'fabi-item-1', item_name: 'Trà Sữa Trân Châu Sợi', category: 'Trà sữa', quantity: qty1, price: 45000 },
          { item_id: 'fabi-item-2', item_name: 'Trà Đào Cam Sả', category: 'Trà trái cây', quantity: qty2, price: 49000 }
        ];

        // Simulate new item discovery sometimes (30% chance)
        let isNewProductDiscovered = false;
        const newProduct = {
          id: Date.now(),
          item_id: `fabi-item-new-${Math.floor(Math.random() * 100) + 10}`,
          item_name: 'Sữa Tươi Trân Châu Đường Đen (Offline)',
          category: 'Sữa tươi',
          price: 55000,
          active: true,
          recipe_missing: true,
          created_at: new Date().toISOString()
        };

        if (Math.random() > 0.3) {
          mockSyncData.push({
            item_id: newProduct.item_id,
            item_name: newProduct.item_name,
            category: newProduct.category,
            quantity: qty3,
            price: newProduct.price
          });
          isNewProductDiscovered = true;
          await db.products.add(newProduct);
          await db.logs.add({
            timestamp: new Date().toISOString(),
            user_name: 'Hệ thống (Offline)',
            action: 'Đồng bộ Fabi',
            details: `Phát hiện món mới từ iPOS: ${newProduct.item_name}. Đã tạo sản phẩm và đánh dấu 'Recipe Missing' để cấu hình định lượng.`
          });
        }

        // Calculate COGS and deduct ingredients
        let totalRevenueNet = 0;
        let totalCogs = 0;
        const saleItems: any[] = [];
        const saleId = Date.now();

        for (const item of mockSyncData) {
          const revNet = item.quantity * item.price;
          totalRevenueNet += revNet;

          const prod = products.find(p => p.item_id === item.item_id) || (isNewProductDiscovered && item.item_id === newProduct.item_id ? newProduct : null);
          if (!prod) continue;

          let itemCogs = 0;
          const recipe = recipes.find(r => r.product_id === prod.id && r.active);
          if (recipe) {
            const rItems = recipeItems.filter(ri => ri.recipe_id === recipe.id);
            for (const rIt of rItems) {
              const ing = ingredients.find(i => i.id === rIt.ingredient_id);
              if (ing) {
                const consumed = Number(rIt.quantity) * item.quantity;
                itemCogs += Number(rIt.quantity) * ing.cost_price;

                // Deduct stock in IndexedDB
                const newStock = Math.max(0, ing.current_stock - consumed);
                await db.ingredients.update(ing.id, { current_stock: newStock });
              }
            }
          }

          const totalItemCogs = itemCogs * item.quantity;
          totalCogs += totalItemCogs;

          saleItems.push({
            id: Date.now() + Math.random(),
            sale_id: saleId,
            product_id: prod.id,
            quantity_sold: item.quantity,
            revenue_net: revNet,
            revenue_gross: revNet,
            discount_amount: 0,
            cogs: totalItemCogs
          });
        }

        const newSale = {
          id: saleId,
          sync_date: new Date().toISOString(),
          start_date: dates?.start_date || todayStr,
          end_date: dates?.end_date || todayStr,
          total_revenue_net: totalRevenueNet,
          total_revenue_gross: totalRevenueNet,
          total_cogs: totalCogs,
          created_at: new Date().toISOString()
        };

        await db.sales.add(newSale);
        await db.sale_items.bulkAdd(saleItems);

        await db.logs.add({
          timestamp: new Date().toISOString(),
          user_name: 'Hệ thống (Offline)',
          action: 'Đồng bộ doanh số',
          details: `Đồng bộ thủ công iPOS ngoại tuyến. Net: ${totalRevenueNet.toLocaleString('vi-VN')}₫, COGS: ${totalCogs.toLocaleString('vi-VN')}₫. Đã khấu trừ kho nguyên vật liệu.`
        });

        return {
          sync_id: saleId,
          new_products_created: isNewProductDiscovered ? 1 : 0,
          total_sales_count: mockSyncData.length,
          total_revenue_net: totalRevenueNet,
          total_cogs: totalCogs
        };
      }
    );
  },

  // ==========================================
  // 7. AUXILIARY DATA
  // ==========================================
  async getLogs() {
    return this.request(
      () => client.get('/logs'),
      async () => {
        const logs = await db.logs.toArray();
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    );
  },

  async getSuppliers() {
    return this.request(
      () => client.get('/suppliers'),
      () => db.suppliers.toArray()
    );
  }
};
