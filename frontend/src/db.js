import Dexie from 'dexie';

export const db = new Dexie('FabiInventoryDB');

// Define database schema
db.version(1).stores({
  suppliers: '++id, name, phone, email, address, notes, created_at',
  ingredients: '++id, name, unit, cost_price, current_stock, min_stock, supplier_id, created_at',
  products: '++id, item_id, item_name, category, price, active, recipe_missing, created_at',
  recipes: '++id, product_id, version, active, created_at',
  recipe_items: '++id, recipe_id, ingredient_id, quantity, created_at',
  imports: '++id, supplier_id, total_cost, note, user_id, created_at',
  import_items: '++id, import_id, ingredient_id, quantity, unit_cost, total_cost',
  exports: '++id, note, user_id, total_value, created_at',
  export_items: '++id, export_id, ingredient_id, quantity, reason, unit_cost, total_cost',
  counts: '++id, date, user_id, total_difference_cost, note, created_at',
  count_items: '++id, count_id, ingredient_id, expected_stock, actual_stock, difference, difference_cost',
  sales: '++id, sync_date, start_date, end_date, total_revenue_net, total_revenue_gross, total_cogs, created_at',
  sale_items: '++id, sale_id, product_id, quantity_sold, revenue_net, revenue_gross, discount_amount, cogs',
  logs: '++id, timestamp, user_name, action, details'
});

// Seed data function to populate Dexie if empty
export async function seedDexie() {
  const supplierCount = await db.suppliers.count();
  if (supplierCount === 0) {
    // 5. System logs
    await db.logs.add({
      timestamp: new Date().toISOString(),
      user_name: 'Hệ thống',
      action: 'Khởi tạo',
      details: 'Khởi tạo cơ sở dữ liệu IndexedDB Dexie.js thành công. Sẵn sàng nhận dữ liệu nhập mới.'
    });
  }
}

// Auto seed when loaded in browser
seedDexie().catch(err => console.error('Dexie seeding failed:', err));
