import { supabase } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.resolve(__dirname, '../../../database.json');

// Interface structures
export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  cost_price: number;
  current_stock: number;
  min_stock: number;
  supplier_id?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  item_id: string; // unique from Fabi
  item_name: string;
  category?: string;
  price: number;
  active: boolean;
  recipe_missing: boolean;
  created_at?: string;
}

export interface Recipe {
  id: number;
  product_id: number;
  version: number;
  active: boolean;
  created_at?: string;
  items?: RecipeItem[];
}

export interface RecipeItem {
  id?: number;
  recipe_id?: number;
  ingredient_id: number;
  quantity: number;
  ingredient_name?: string;
  ingredient_unit?: string;
}

export interface Import {
  id: number;
  supplier_id?: number;
  total_cost: number;
  note?: string;
  user_id?: string;
  created_at?: string;
  items?: ImportItem[];
}

export interface ImportItem {
  id?: number;
  import_id?: number;
  ingredient_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Export {
  id: number;
  note?: string;
  user_id?: string;
  total_value: number;
  created_at?: string;
  items?: ExportItem[];
}

export interface ExportItem {
  id?: number;
  export_id?: number;
  ingredient_id: number;
  quantity: number;
  reason: string;
  unit_cost: number;
  total_cost: number;
}

export interface Count {
  id: number;
  date: string;
  user_id?: string;
  total_difference_cost: number;
  note?: string;
  created_at?: string;
  items?: CountItem[];
}

export interface CountItem {
  id?: number;
  count_id?: number;
  ingredient_id: number;
  expected_stock: number;
  actual_stock: number;
  difference: number;
  difference_cost: number;
}

export interface Sale {
  id: number;
  sync_date?: string;
  start_date: string;
  end_date: string;
  total_revenue_net: number;
  total_revenue_gross: number;
  total_cogs: number;
  created_at?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  quantity_sold: number;
  revenue_net: number;
  revenue_gross: number;
  discount_amount: number;
  cogs: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_name: string;
  action: string;
  details: string;
}

// Local Database In-Memory Storage & File System Persistence for Fallback
class LocalDatabase {
  private data: any = null;

  private load() {
    if (this.data) return this.data;
    if (fs.existsSync(LOCAL_DB_PATH)) {
      try {
        const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
        return this.data;
      } catch (err) {
        console.error('Lỗi đọc database.json, đang khởi tạo lại:', err);
      }
    }

    // Seed initial mock data
    const defaultData = {
      suppliers: [],
      ingredients: [],
      products: [],
      recipes: [],
      recipe_items: [],
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
    if (!this.data) return;
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Lỗi lưu database.json:', err);
    }
  }

  getTable(tableName: string): any[] {
    const db = this.load();
    return db[tableName] || [];
  }

  saveTable(tableName: string, rows: any[]) {
    const db = this.load();
    db[tableName] = rows;
    this.save();
  }
}

export const localDB = new LocalDatabase();

// REPOSITORIES
export class SupplierRepository {
  static async getAll(): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data;
    } catch (err) {
      return localDB.getTable('suppliers');
    }
  }
}

export class ProductRepository {
  static async getAll(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select('*').order('item_name');
      if (error) throw error;
      return data;
    } catch (err) {
      return localDB.getTable('products');
    }
  }

  static async getByItemId(itemId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('item_id', itemId).maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('products');
      return list.find(p => p.item_id === itemId) || null;
    }
  }

  static async upsert(product: Omit<Product, 'id'> & { id?: number }): Promise<Product> {
    try {
      const { data, error } = await supabase.from('products').upsert(product).select().single();
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('products');
      if (product.id) {
        const idx = list.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...product };
        }
      } else {
        const existing = list.find(p => p.item_id === product.item_id);
        if (existing) {
          Object.assign(existing, product);
          product.id = existing.id;
        } else {
          product.id = Date.now() + Math.floor(Math.random() * 1000);
          list.push(product as Product);
        }
      }
      localDB.saveTable('products', list);
      return product as Product;
    }
  }

  static async updateRecipeStatus(id: number, missing: boolean): Promise<void> {
    try {
      const { error } = await supabase.from('products').update({ recipe_missing: missing }).eq('id', id);
      if (error) throw error;
    } catch (err) {
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
  static async getAll(): Promise<Ingredient[]> {
    try {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      return data;
    } catch (err) {
      return localDB.getTable('ingredients');
    }
  }

  static async save(ing: Omit<Ingredient, 'id'> & { id?: number }): Promise<Ingredient> {
    try {
      const { data, error } = await supabase.from('ingredients').upsert(ing).select().single();
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('ingredients');
      if (ing.id) {
        const idx = list.findIndex(i => i.id === ing.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...ing };
        }
      } else {
        ing.id = Date.now() + Math.floor(Math.random() * 1000);
        list.push(ing as Ingredient);
      }
      localDB.saveTable('ingredients', list);
      return ing as Ingredient;
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      const list = localDB.getTable('ingredients');
      const filtered = list.filter(i => i.id !== id);
      localDB.saveTable('ingredients', filtered);
    }
  }
}

export class RecipeRepository {
  static async getAll(): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase.from('recipes').select('*, items:recipe_items(*)');
      if (error) throw error;
      return data;
    } catch (err) {
      const recipes = localDB.getTable('recipes') as Recipe[];
      const items = localDB.getTable('recipe_items') as RecipeItem[];
      
      return recipes.map(r => ({
        ...r,
        items: items.filter(it => it.recipe_id === r.id)
      }));
    }
  }

  static async getByProductId(productId: number): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, items:recipe_items(*)')
        .eq('product_id', productId)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      const recipes = localDB.getTable('recipes');
      const r = recipes.find(item => item.product_id === productId && item.active);
      if (!r) return null;
      
      const items = localDB.getTable('recipe_items');
      return {
        ...r,
        items: items.filter((it: any) => it.recipe_id === r.id)
      };
    }
  }

  static async save(productId: number, items: Omit<RecipeItem, 'id' | 'recipe_id'>[]): Promise<Recipe> {
    try {
      // Create new version or deactivate old recipe
      await supabase.from('recipes').update({ active: false }).eq('product_id', productId);
      
      const { data: newRecipe, error: recError } = await supabase
        .from('recipes')
        .insert({ product_id: productId, version: 1, active: true })
        .select()
        .single();
        
      if (recError) throw recError;

      const itemsToInsert = items.map(it => ({
        recipe_id: newRecipe.id,
        ingredient_id: it.ingredient_id,
        quantity: it.quantity
      }));

      const { error: itemError } = await supabase.from('recipe_items').insert(itemsToInsert);
      if (itemError) throw itemError;

      // Update product status
      await ProductRepository.updateRecipeStatus(productId, items.length === 0);

      return newRecipe;
    } catch (err) {
      const recipes = localDB.getTable('recipes');
      const recipeItems = localDB.getTable('recipe_items');

      // Deactivate old recipes
      recipes.forEach((r: any) => {
        if (r.product_id === productId) r.active = false;
      });

      const newId = Date.now();
      const newRecipe: Recipe = {
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
      const p = products.find((item: any) => item.id === productId);
      if (p) p.recipe_missing = items.length === 0;
      localDB.saveTable('products', products);

      return newRecipe;
    }
  }
}

export class InventoryRepository {
  // IMPORTS
  static async getImports(): Promise<Import[]> {
    try {
      const { data, error } = await supabase.from('inventory_imports').select('*, items:import_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('imports') as Import[];
      const items = localDB.getTable('import_items') as ImportItem[];
      return list.map(i => ({
        ...i,
        items: items.filter(it => it.import_id === i.id)
      })).sort((a,b) => b.id - a.id);
    }
  }

  static async addImport(imp: Omit<Import, 'id' | 'created_at'>, items: Omit<ImportItem, 'id' | 'import_id'>[]): Promise<Import> {
    try {
      const { data: newImport, error: impError } = await supabase.from('inventory_imports').insert(imp).select().single();
      if (impError) throw impError;

      const itemsToInsert = items.map(it => ({ ...it, import_id: newImport.id }));
      const { error: itemError } = await supabase.from('import_items').insert(itemsToInsert);
      if (itemError) throw itemError;

      // Update stocks
      for (const it of items) {
        const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', it.ingredient_id).single();
        if (ing) {
          const newStock = Number(ing.current_stock) + Number(it.quantity);
          await supabase.from('ingredients').update({ current_stock: newStock, cost_price: it.unit_cost }).eq('id', it.ingredient_id);
        }
      }

      return newImport;
    } catch (err) {
      const imports = localDB.getTable('imports');
      const importItems = localDB.getTable('import_items');
      const ingredients = localDB.getTable('ingredients');

      const impId = Date.now();
      const newImport: Import = {
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
  static async getExports(): Promise<Export[]> {
    try {
      const { data, error } = await supabase.from('inventory_exports').select('*, items:export_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('exports') as Export[];
      const items = localDB.getTable('export_items') as ExportItem[];
      return list.map(e => ({
        ...e,
        items: items.filter(it => it.export_id === e.id)
      })).sort((a,b) => b.id - a.id);
    }
  }

  static async addExport(exp: Omit<Export, 'id' | 'created_at'>, items: Omit<ExportItem, 'id' | 'export_id'>[]): Promise<Export> {
    try {
      const { data: newExport, error: expError } = await supabase.from('inventory_exports').insert(exp).select().single();
      if (expError) throw expError;

      const itemsToInsert = items.map(it => ({ ...it, export_id: newExport.id }));
      const { error: itemError } = await supabase.from('export_items').insert(itemsToInsert);
      if (itemError) throw itemError;

      // Update stocks
      for (const it of items) {
        const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', it.ingredient_id).single();
        if (ing) {
          const newStock = Number(ing.current_stock) - Number(it.quantity);
          await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', it.ingredient_id);
        }
      }

      return newExport;
    } catch (err) {
      const exports = localDB.getTable('exports');
      const exportItems = localDB.getTable('export_items');
      const ingredients = localDB.getTable('ingredients');

      const expId = Date.now();
      const newExport: Export = {
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
  static async getCounts(): Promise<Count[]> {
    try {
      const { data, error } = await supabase.from('inventory_counts').select('*, items:count_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('counts') as Count[];
      const items = localDB.getTable('count_items') as CountItem[];
      return list.map(c => ({
        ...c,
        items: items.filter(it => it.count_id === c.id)
      })).sort((a,b) => b.id - a.id);
    }
  }

  static async addCount(countData: Omit<Count, 'id' | 'created_at' | 'date'>, items: Omit<CountItem, 'id' | 'count_id'>[]): Promise<Count> {
    try {
      const { data: newCount, error: cntError } = await supabase.from('inventory_counts').insert(countData).select().single();
      if (cntError) throw cntError;

      const itemsToInsert = items.map(it => ({ ...it, count_id: newCount.id }));
      const { error: itemError } = await supabase.from('count_items').insert(itemsToInsert);
      if (itemError) throw itemError;

      // Update stocks to ACTUAL counted stock!
      for (const it of items) {
        await supabase.from('ingredients').update({ current_stock: it.actual_stock }).eq('id', it.ingredient_id);
      }

      return newCount;
    } catch (err) {
      const counts = localDB.getTable('counts');
      const countItems = localDB.getTable('count_items');
      const ingredients = localDB.getTable('ingredients');

      const cntId = Date.now();
      const dateStr = new Date().toISOString();
      const newCount: Count = {
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
  static async getSales(): Promise<Sale[]> {
    try {
      const { data, error } = await supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('sales') as Sale[];
      const items = localDB.getTable('sale_items') as SaleItem[];
      return list.map(s => ({
        ...s,
        items: items.filter(it => it.sale_id === s.id)
      })).sort((a,b) => b.id - a.id);
    }
  }

  static async addSale(sale: Omit<Sale, 'id' | 'created_at' | 'sync_date'>, items: Omit<SaleItem, 'id' | 'sale_id'>[]): Promise<Sale> {
    try {
      const { data: newSale, error: saleError } = await supabase.from('sales').insert(sale).select().single();
      if (saleError) throw saleError;

      const itemsToInsert = items.map(it => ({ ...it, sale_id: newSale.id }));
      const { error: itemError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemError) throw itemError;

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
    } catch (err) {
      const sales = localDB.getTable('sales');
      const saleItems = localDB.getTable('sale_items');
      const ingredients = localDB.getTable('ingredients');

      const saleId = Date.now();
      const newSale: Sale = {
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
        const recipe = RecipeRepository.getByProductId(it.product_id) as any; // synchronous fallback call
        if (recipe && recipe.items) {
          recipe.items.forEach((recItem: any) => {
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
  static async getAll(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      return localDB.getTable('logs').sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  }

  static async add(action: string, details: string, userName: string = 'Hệ thống'): Promise<AuditLog> {
    const newLog = {
      timestamp: new Date().toISOString(),
      user_name: userName,
      action: action,
      details: details
    };

    try {
      const { data, error } = await supabase.from('logs').insert(newLog).select().single();
      if (error) throw error;
      return data;
    } catch (err) {
      const list = localDB.getTable('logs');
      const logWithId: AuditLog = {
        id: Date.now(),
        ...newLog
      };
      list.unshift(logWithId);
      if (list.length > 500) list.pop();
      localDB.saveTable('logs', list);
      return logWithId;
    }
  }
}
