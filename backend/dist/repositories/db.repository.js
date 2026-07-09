import { supabase } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Helper for ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.resolve(__dirname, '../../../database.json');
// Local Database In-Memory Storage & File System Persistence for Fallback
class LocalDatabase {
    data = null;
    load() {
        if (this.data)
            return this.data;
        if (fs.existsSync(LOCAL_DB_PATH)) {
            try {
                const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
                this.data = JSON.parse(raw);
                return this.data;
            }
            catch (err) {
                console.error('Lỗi đọc database.json, đang khởi tạo lại:', err);
            }
        }
        // Seed initial mock data
        const defaultData = {
            suppliers: [
                { id: 1, name: 'Tổng Kho Nguyên Liệu Cát Tường', phone: '0901234567', email: 'cattuong@gmail.com', address: '120 Lý Thường Kiệt, Q.10, TP.HCM', notes: 'Cung cấp trà và siro' },
                { id: 2, name: 'Vinamilk Việt Nam', phone: '0283820220', email: 'contact@vinamilk.com', address: '10 Tân Trào, Q.7, TP.HCM', notes: 'Sữa tươi, sữa đặc' },
                { id: 3, name: 'Bao Bì Xanh', phone: '0933445566', email: 'pack@baobixanh.com', address: '45 Lê Lợi, Gò Vấp, TP.HCM', notes: 'Ly, túi bóng, ống hút' }
            ],
            ingredients: [
                { id: 1, name: 'Trà Đen Lộc Phát (Gói 1kg)', unit: 'Gói', cost_price: 120000, current_stock: 42, min_stock: 10, supplier_id: 1 },
                { id: 2, name: 'Trà Lài Lộc Phát (Gói 1kg)', unit: 'Gói', cost_price: 150000, current_stock: 28, min_stock: 8, supplier_id: 1 },
                { id: 3, name: 'Bột sữa B-one (Bao 1kg)', unit: 'Bao', cost_price: 75000, current_stock: 35, min_stock: 12, supplier_id: 1 },
                { id: 4, name: 'Sữa đặc Ngôi Sao Phương Nam (Hộp 1.28kg)', unit: 'Hộp', cost_price: 68000, current_stock: 52, min_stock: 15, supplier_id: 2 },
                { id: 5, name: 'Siro Đào Teisseire (Chai 700ml)', unit: 'Chai', cost_price: 210000, current_stock: 8, min_stock: 5, supplier_id: 1 },
                { id: 6, name: 'Trân châu đen Wings (Túi 3kg)', unit: 'Túi', cost_price: 95000, current_stock: 4, min_stock: 6, supplier_id: 1 },
                { id: 7, name: 'Ly Nhựa Phi 95 500ml (Cây 50 cái)', unit: 'Cây', cost_price: 45000, current_stock: 85, min_stock: 20, supplier_id: 3 },
                { id: 8, name: 'Ống hút trân châu (Gói 100 cái)', unit: 'Gói', cost_price: 15000, current_stock: 75, min_stock: 15, supplier_id: 3 }
            ],
            products: [
                { id: 1, item_id: 'fabi-item-1', item_name: 'Trà Sữa Trân Châu Sợi', category: 'Trà sữa', price: 45000, active: true, recipe_missing: false },
                { id: 2, item_id: 'fabi-item-2', item_name: 'Trà Đào Cam Sả', category: 'Trà trái cây', price: 49000, active: true, recipe_missing: false },
                { id: 3, item_id: 'fabi-item-3', item_name: 'Cà Phê Sữa Đá', category: 'Cà phê', price: 29000, active: true, recipe_missing: true }
            ],
            recipes: [
                { id: 1, product_id: 1, version: 1, active: true },
                { id: 2, product_id: 2, version: 1, active: true }
            ],
            recipe_items: [
                // Trà Sữa Trân Châu Sợi
                { id: 1, recipe_id: 1, ingredient_id: 1, quantity: 0.120 }, // 120ml cốt trà đen (0.12 gói)
                { id: 2, recipe_id: 1, ingredient_id: 3, quantity: 0.035 }, // 35g bột sữa (0.035 bao)
                { id: 3, recipe_id: 1, ingredient_id: 4, quantity: 0.040 }, // 40ml sữa đặc (0.04 hộp)
                { id: 4, recipe_id: 1, ingredient_id: 6, quantity: 0.050 }, // 50g trân châu (0.05 túi)
                { id: 5, recipe_id: 1, ingredient_id: 7, quantity: 0.020 }, // 1 ly (1/50 cây = 0.02 cây)
                // Trà đào cam sả
                { id: 6, recipe_id: 2, ingredient_id: 2, quantity: 0.120 }, // 120ml trà lài
                { id: 7, recipe_id: 2, ingredient_id: 5, quantity: 0.035 }, // 35ml siro đào (0.035 chai 1l)
                { id: 8, recipe_id: 2, ingredient_id: 7, quantity: 0.020 } // ly nhựa
            ],
            imports: [],
            import_items: [],
            exports: [],
            export_items: [],
            counts: [],
            count_items: [],
            sales: [],
            sale_items: [],
            logs: [
                { id: 1, timestamp: new Date().toISOString(), user_name: 'Hệ thống', action: 'Khởi tạo', details: 'Khởi tạo cơ sở dữ liệu dự phòng cục bộ' }
            ]
        };
        this.data = defaultData;
        this.save();
        return this.data;
    }
    save() {
        if (!this.data)
            return;
        try {
            fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Lỗi lưu database.json:', err);
        }
    }
    getTable(tableName) {
        const db = this.load();
        return db[tableName] || [];
    }
    saveTable(tableName, rows) {
        const db = this.load();
        db[tableName] = rows;
        this.save();
    }
}
export const localDB = new LocalDatabase();
// REPOSITORIES
export class SupplierRepository {
    static async getAll() {
        try {
            const { data, error } = await supabase.from('suppliers').select('*').order('name');
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            return localDB.getTable('suppliers');
        }
    }
}
export class ProductRepository {
    static async getAll() {
        try {
            const { data, error } = await supabase.from('products').select('*').order('item_name');
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            return localDB.getTable('products');
        }
    }
    static async getByItemId(itemId) {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('item_id', itemId).maybeSingle();
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('products');
            return list.find(p => p.item_id === itemId) || null;
        }
    }
    static async upsert(product) {
        try {
            const { data, error } = await supabase.from('products').upsert(product).select().single();
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('products');
            if (product.id) {
                const idx = list.findIndex(p => p.id === product.id);
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...product };
                }
            }
            else {
                const existing = list.find(p => p.item_id === product.item_id);
                if (existing) {
                    Object.assign(existing, product);
                    product.id = existing.id;
                }
                else {
                    product.id = Date.now() + Math.floor(Math.random() * 1000);
                    list.push(product);
                }
            }
            localDB.saveTable('products', list);
            return product;
        }
    }
    static async updateRecipeStatus(id, missing) {
        try {
            const { error } = await supabase.from('products').update({ recipe_missing: missing }).eq('id', id);
            if (error)
                throw error;
        }
        catch (err) {
            const list = localDB.getTable('products');
            const p = list.find(item => item.id === id);
            if (p) {
                p.recipe_missing = missing;
                localDB.saveTable('products', list);
            }
        }
    }
}
export class IngredientRepository {
    static async getAll() {
        try {
            const { data, error } = await supabase.from('ingredients').select('*').order('name');
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            return localDB.getTable('ingredients');
        }
    }
    static async save(ing) {
        try {
            const { data, error } = await supabase.from('ingredients').upsert(ing).select().single();
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('ingredients');
            if (ing.id) {
                const idx = list.findIndex(i => i.id === ing.id);
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...ing };
                }
            }
            else {
                ing.id = Date.now() + Math.floor(Math.random() * 1000);
                list.push(ing);
            }
            localDB.saveTable('ingredients', list);
            return ing;
        }
    }
    static async delete(id) {
        try {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error)
                throw error;
        }
        catch (err) {
            const list = localDB.getTable('ingredients');
            const filtered = list.filter(i => i.id !== id);
            localDB.saveTable('ingredients', filtered);
        }
    }
}
export class RecipeRepository {
    static async getAll() {
        try {
            const { data, error } = await supabase.from('recipes').select('*, items:recipe_items(*)');
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const recipes = localDB.getTable('recipes');
            const items = localDB.getTable('recipe_items');
            return recipes.map(r => ({
                ...r,
                items: items.filter(it => it.recipe_id === r.id)
            }));
        }
    }
    static async getByProductId(productId) {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select('*, items:recipe_items(*)')
                .eq('product_id', productId)
                .eq('active', true)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const recipes = localDB.getTable('recipes');
            const r = recipes.find(item => item.product_id === productId && item.active);
            if (!r)
                return null;
            const items = localDB.getTable('recipe_items');
            return {
                ...r,
                items: items.filter((it) => it.recipe_id === r.id)
            };
        }
    }
    static async save(productId, items) {
        try {
            // Create new version or deactivate old recipe
            await supabase.from('recipes').update({ active: false }).eq('product_id', productId);
            const { data: newRecipe, error: recError } = await supabase
                .from('recipes')
                .insert({ product_id: productId, version: 1, active: true })
                .select()
                .single();
            if (recError)
                throw recError;
            const itemsToInsert = items.map(it => ({
                recipe_id: newRecipe.id,
                ingredient_id: it.ingredient_id,
                quantity: it.quantity
            }));
            const { error: itemError } = await supabase.from('recipe_items').insert(itemsToInsert);
            if (itemError)
                throw itemError;
            // Update product status
            await ProductRepository.updateRecipeStatus(productId, items.length === 0);
            return newRecipe;
        }
        catch (err) {
            const recipes = localDB.getTable('recipes');
            const recipeItems = localDB.getTable('recipe_items');
            // Deactivate old recipes
            recipes.forEach((r) => {
                if (r.product_id === productId)
                    r.active = false;
            });
            const newId = Date.now();
            const newRecipe = {
                id: newId,
                product_id: productId,
                version: 1,
                active: true
            };
            recipes.push(newRecipe);
            items.forEach((it, idx) => {
                recipeItems.push({
                    id: Date.now() + idx,
                    recipe_id: newId,
                    ingredient_id: it.ingredient_id,
                    quantity: it.quantity
                });
            });
            localDB.saveTable('recipes', recipes);
            localDB.saveTable('recipe_items', recipeItems);
            // Update status
            const products = localDB.getTable('products');
            const p = products.find((item) => item.id === productId);
            if (p)
                p.recipe_missing = items.length === 0;
            localDB.saveTable('products', products);
            return newRecipe;
        }
    }
}
export class InventoryRepository {
    // IMPORTS
    static async getImports() {
        try {
            const { data, error } = await supabase.from('inventory_imports').select('*, items:import_items(*)').order('created_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('imports');
            const items = localDB.getTable('import_items');
            return list.map(i => ({
                ...i,
                items: items.filter(it => it.import_id === i.id)
            })).sort((a, b) => b.id - a.id);
        }
    }
    static async addImport(imp, items) {
        try {
            const { data: newImport, error: impError } = await supabase.from('inventory_imports').insert(imp).select().single();
            if (impError)
                throw impError;
            const itemsToInsert = items.map(it => ({ ...it, import_id: newImport.id }));
            const { error: itemError } = await supabase.from('import_items').insert(itemsToInsert);
            if (itemError)
                throw itemError;
            // Update stocks
            for (const it of items) {
                const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', it.ingredient_id).single();
                if (ing) {
                    const newStock = Number(ing.current_stock) + Number(it.quantity);
                    await supabase.from('ingredients').update({ current_stock: newStock, cost_price: it.unit_cost }).eq('id', it.ingredient_id);
                }
            }
            return newImport;
        }
        catch (err) {
            const imports = localDB.getTable('imports');
            const importItems = localDB.getTable('import_items');
            const ingredients = localDB.getTable('ingredients');
            const impId = Date.now();
            const newImport = {
                id: impId,
                supplier_id: imp.supplier_id,
                total_cost: imp.total_cost,
                note: imp.note,
                user_id: imp.user_id,
                created_at: new Date().toISOString()
            };
            imports.push(newImport);
            items.forEach((it, idx) => {
                importItems.push({
                    id: Date.now() + idx,
                    import_id: impId,
                    ingredient_id: it.ingredient_id,
                    quantity: it.quantity,
                    unit_cost: it.unit_cost,
                    total_cost: it.total_cost
                });
                // Update ingredient stock & cost price
                const ingredient = ingredients.find(ing => ing.id === it.ingredient_id);
                if (ingredient) {
                    ingredient.current_stock = Number(ingredient.current_stock) + Number(it.quantity);
                    ingredient.cost_price = it.unit_cost; // update cost price to latest import cost
                }
            });
            localDB.saveTable('imports', imports);
            localDB.saveTable('import_items', importItems);
            localDB.saveTable('ingredients', ingredients);
            return newImport;
        }
    }
    // EXPORTS
    static async getExports() {
        try {
            const { data, error } = await supabase.from('inventory_exports').select('*, items:export_items(*)').order('created_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('exports');
            const items = localDB.getTable('export_items');
            return list.map(e => ({
                ...e,
                items: items.filter(it => it.export_id === e.id)
            })).sort((a, b) => b.id - a.id);
        }
    }
    static async addExport(exp, items) {
        try {
            const { data: newExport, error: expError } = await supabase.from('inventory_exports').insert(exp).select().single();
            if (expError)
                throw expError;
            const itemsToInsert = items.map(it => ({ ...it, export_id: newExport.id }));
            const { error: itemError } = await supabase.from('export_items').insert(itemsToInsert);
            if (itemError)
                throw itemError;
            // Update stocks
            for (const it of items) {
                const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', it.ingredient_id).single();
                if (ing) {
                    const newStock = Number(ing.current_stock) - Number(it.quantity);
                    await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', it.ingredient_id);
                }
            }
            return newExport;
        }
        catch (err) {
            const exports = localDB.getTable('exports');
            const exportItems = localDB.getTable('export_items');
            const ingredients = localDB.getTable('ingredients');
            const expId = Date.now();
            const newExport = {
                id: expId,
                note: exp.note,
                user_id: exp.user_id,
                total_value: exp.total_value,
                created_at: new Date().toISOString()
            };
            exports.push(newExport);
            items.forEach((it, idx) => {
                exportItems.push({
                    id: Date.now() + idx,
                    export_id: expId,
                    ingredient_id: it.ingredient_id,
                    quantity: it.quantity,
                    reason: it.reason,
                    unit_cost: it.unit_cost,
                    total_cost: it.total_cost
                });
                // Deduct ingredient stock
                const ingredient = ingredients.find(ing => ing.id === it.ingredient_id);
                if (ingredient) {
                    ingredient.current_stock = Number(ingredient.current_stock) - Number(it.quantity);
                }
            });
            localDB.saveTable('exports', exports);
            localDB.saveTable('export_items', exportItems);
            localDB.saveTable('ingredients', ingredients);
            return newExport;
        }
    }
    // COUNTS (Kiểm kho cuối ca)
    static async getCounts() {
        try {
            const { data, error } = await supabase.from('inventory_counts').select('*, items:count_items(*)').order('created_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('counts');
            const items = localDB.getTable('count_items');
            return list.map(c => ({
                ...c,
                items: items.filter(it => it.count_id === c.id)
            })).sort((a, b) => b.id - a.id);
        }
    }
    static async addCount(countData, items) {
        try {
            const { data: newCount, error: cntError } = await supabase.from('inventory_counts').insert(countData).select().single();
            if (cntError)
                throw cntError;
            const itemsToInsert = items.map(it => ({ ...it, count_id: newCount.id }));
            const { error: itemError } = await supabase.from('count_items').insert(itemsToInsert);
            if (itemError)
                throw itemError;
            // Update stocks to ACTUAL counted stock!
            for (const it of items) {
                await supabase.from('ingredients').update({ current_stock: it.actual_stock }).eq('id', it.ingredient_id);
            }
            return newCount;
        }
        catch (err) {
            const counts = localDB.getTable('counts');
            const countItems = localDB.getTable('count_items');
            const ingredients = localDB.getTable('ingredients');
            const cntId = Date.now();
            const dateStr = new Date().toISOString();
            const newCount = {
                id: cntId,
                date: dateStr,
                user_id: countData.user_id,
                total_difference_cost: countData.total_difference_cost,
                note: countData.note,
                created_at: dateStr
            };
            counts.push(newCount);
            items.forEach((it, idx) => {
                countItems.push({
                    id: Date.now() + idx,
                    count_id: cntId,
                    ingredient_id: it.ingredient_id,
                    expected_stock: it.expected_stock,
                    actual_stock: it.actual_stock,
                    difference: it.difference,
                    difference_cost: it.difference_cost
                });
                // Set ingredient stock to actual counted stock
                const ingredient = ingredients.find(ing => ing.id === it.ingredient_id);
                if (ingredient) {
                    ingredient.current_stock = it.actual_stock;
                }
            });
            localDB.saveTable('counts', counts);
            localDB.saveTable('count_items', countItems);
            localDB.saveTable('ingredients', ingredients);
            return newCount;
        }
    }
}
export class SaleRepository {
    static async getSales() {
        try {
            const { data, error } = await supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('sales');
            const items = localDB.getTable('sale_items');
            return list.map(s => ({
                ...s,
                items: items.filter(it => it.sale_id === s.id)
            })).sort((a, b) => b.id - a.id);
        }
    }
    static async addSale(sale, items) {
        try {
            const { data: newSale, error: saleError } = await supabase.from('sales').insert(sale).select().single();
            if (saleError)
                throw saleError;
            const itemsToInsert = items.map(it => ({ ...it, sale_id: newSale.id }));
            const { error: itemError } = await supabase.from('sale_items').insert(itemsToInsert);
            if (itemError)
                throw itemError;
            // Consume inventory based on Recipe/BOM!
            for (const item of items) {
                const recipe = await RecipeRepository.getByProductId(item.product_id);
                if (recipe && recipe.items) {
                    for (const recItem of recipe.items) {
                        const consumedQty = Number(recItem.quantity) * Number(item.quantity_sold);
                        const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', recItem.ingredient_id).single();
                        if (ing) {
                            const newStock = Number(ing.current_stock) - consumedQty;
                            await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', recItem.ingredient_id);
                        }
                    }
                }
            }
            return newSale;
        }
        catch (err) {
            const sales = localDB.getTable('sales');
            const saleItems = localDB.getTable('sale_items');
            const ingredients = localDB.getTable('ingredients');
            const saleId = Date.now();
            const newSale = {
                id: saleId,
                sync_date: new Date().toISOString(),
                start_date: sale.start_date,
                end_date: sale.end_date,
                total_revenue_net: sale.total_revenue_net,
                total_revenue_gross: sale.total_revenue_gross,
                total_cogs: sale.total_cogs,
                created_at: new Date().toISOString()
            };
            sales.push(newSale);
            items.forEach((it, idx) => {
                saleItems.push({
                    id: Date.now() + idx,
                    sale_id: saleId,
                    product_id: it.product_id,
                    quantity_sold: it.quantity_sold,
                    revenue_net: it.revenue_net,
                    revenue_gross: it.revenue_gross,
                    discount_amount: it.discount_amount,
                    cogs: it.cogs
                });
                // Consume inventory ingredients based on recipes!
                const recipe = RecipeRepository.getByProductId(it.product_id); // synchronous fallback call
                if (recipe && recipe.items) {
                    recipe.items.forEach((recItem) => {
                        const consumedQty = Number(recItem.quantity) * Number(it.quantity_sold);
                        const ingredient = ingredients.find(ing => ing.id === recItem.ingredient_id);
                        if (ingredient) {
                            ingredient.current_stock = Number(ingredient.current_stock) - consumedQty;
                        }
                    });
                }
            });
            localDB.saveTable('sales', sales);
            localDB.saveTable('sale_items', saleItems);
            localDB.saveTable('ingredients', ingredients);
            return newSale;
        }
    }
}
export class LogRepository {
    static async getAll() {
        try {
            const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            return localDB.getTable('logs').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
    }
    static async add(action, details, userName = 'Hệ thống') {
        const newLog = {
            timestamp: new Date().toISOString(),
            user_name: userName,
            action: action,
            details: details
        };
        try {
            const { data, error } = await supabase.from('logs').insert(newLog).select().single();
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            const list = localDB.getTable('logs');
            const logWithId = {
                id: Date.now(),
                ...newLog
            };
            list.unshift(logWithId);
            if (list.length > 500)
                list.pop();
            localDB.saveTable('logs', list);
            return logWithId;
        }
    }
}
