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
    // 1. Suppliers
    const suppliers = [
      { id: 1, name: 'Tổng Kho Nguyên Liệu Cát Tường', phone: '0901234567', email: 'cattuong@gmail.com', address: '120 Lý Thường Kiệt, Q.10, TP.HCM', notes: 'Nhà phân phối nguyên liệu trà sữa chính', created_at: new Date().toISOString() },
      { id: 2, name: 'Công ty Sữa Vinamilk', phone: '0283820220', email: 'sales@vinamilk.com', address: '10 Tân Trào, Q.7, TP.HCM', notes: 'Cung cấp sữa đặc, sữa tươi', created_at: new Date().toISOString() },
      { id: 3, name: 'Bao Bì Xanh Group', phone: '0933445566', email: 'contact@baobixanh.com', address: '45 Lê Lợi, Gò Vấp, TP.HCM', notes: 'Ly nhựa, túi đựng chữ T, ống hút', created_at: new Date().toISOString() }
    ];
    await db.suppliers.bulkAdd(suppliers);

    // 2. Ingredients
    const ingredients = [
      { id: 1, name: 'Trà Đen Lộc Phát (Gói 1kg)', unit: 'Gói', cost_price: 120000, current_stock: 42, min_stock: 10, supplier_id: 1, created_at: new Date().toISOString() },
      { id: 2, name: 'Trà Lài Lộc Phát (Gói 1kg)', unit: 'Gói', cost_price: 150000, current_stock: 28, min_stock: 8, supplier_id: 1, created_at: new Date().toISOString() },
      { id: 3, name: 'Bột sữa béo B-one (Bao 1kg)', unit: 'Bao', cost_price: 75000, current_stock: 35, min_stock: 12, supplier_id: 1, created_at: new Date().toISOString() },
      { id: 4, name: 'Sữa đặc Phương Nam xanh (Hộp 1.28kg)', unit: 'Hộp', cost_price: 68000, current_stock: 52, min_stock: 15, supplier_id: 2, created_at: new Date().toISOString() },
      { id: 5, name: 'Siro Đào Teisseire (Chai 700ml)', unit: 'Chai', cost_price: 210000, current_stock: 8, min_stock: 5, supplier_id: 1, created_at: new Date().toISOString() },
      { id: 6, name: 'Trân châu đen Wings (Túi 3kg)', unit: 'Túi', cost_price: 95000, current_stock: 4, min_stock: 6, supplier_id: 1, created_at: new Date().toISOString() },
      { id: 7, name: 'Ly Nhựa Phi 95 500ml (Cây 50 cái)', unit: 'Cây', cost_price: 45000, current_stock: 85, min_stock: 20, supplier_id: 3, created_at: new Date().toISOString() },
      { id: 8, name: 'Ống hút trân châu phi 12 (Gói 100 cái)', unit: 'Gói', cost_price: 15000, current_stock: 75, min_stock: 15, supplier_id: 3, created_at: new Date().toISOString() }
    ];
    await db.ingredients.bulkAdd(ingredients);

    // 3. Products
    const products = [
      { id: 1, item_id: 'fabi-item-1', item_name: 'Trà Sữa Trân Châu Sợi', category: 'Trà sữa', price: 45000, active: true, recipe_missing: false, created_at: new Date().toISOString() },
      { id: 2, item_id: 'fabi-item-2', item_name: 'Trà Đào Cam Sả', category: 'Trà trái cây', price: 49000, active: true, recipe_missing: false, created_at: new Date().toISOString() },
      { id: 3, item_id: 'fabi-item-3', item_name: 'Cà Phê Sữa Đá', category: 'Cà phê', price: 29000, active: true, recipe_missing: true, created_at: new Date().toISOString() }
    ];
    await db.products.bulkAdd(products);

    // 4. Recipes & items
    await db.recipes.bulkAdd([
      { id: 1, product_id: 1, version: 1, active: true, created_at: new Date().toISOString() },
      { id: 2, product_id: 2, version: 1, active: true, created_at: new Date().toISOString() }
    ]);

    await db.recipe_items.bulkAdd([
      // Trà sữa trân châu sợi
      { id: 1, recipe_id: 1, ingredient_id: 1, quantity: 0.120 }, // 120g trà đen
      { id: 2, recipe_id: 1, ingredient_id: 3, quantity: 0.035 }, // 35g bột sữa
      { id: 3, recipe_id: 1, ingredient_id: 4, quantity: 0.040 }, // 40g sữa đặc
      { id: 4, recipe_id: 1, ingredient_id: 6, quantity: 0.050 }, // 50g trân châu
      { id: 5, recipe_id: 1, ingredient_id: 7, quantity: 0.020 }, // 1 ly nhựa (1/50 cây)
      // Trà đào cam sả
      { id: 6, recipe_id: 2, ingredient_id: 2, quantity: 0.120 }, // 120g trà lài
      { id: 7, recipe_id: 2, ingredient_id: 5, quantity: 0.035 }, // 35ml siro đào
      { id: 8, recipe_id: 2, ingredient_id: 7, quantity: 0.020 }  // ly nhựa
    ]);

    // 5. System logs
    await db.logs.add({
      timestamp: new Date().toISOString(),
      user_name: 'Hệ thống',
      action: 'Khởi tạo',
      details: 'Khởi tạo cơ sở dữ liệu IndexedDB Dexie.js và nạp dữ liệu quán nước mẫu thành công.'
    });
  }
}

// Auto seed when loaded in browser
seedDexie().catch(err => console.error('Dexie seeding failed:', err));
