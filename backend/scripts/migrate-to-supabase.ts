/**
 * Script chuyển dữ liệu từ database.json lên Supabase
 * 
 * Cách chạy:
 *   cd backend
 *   npx tsx scripts/migrate-to-supabase.ts
 * 
 * YÊU CẦU: 
 *   - File .env phải có SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY đúng
 *   - Các bảng trong Supabase đã được tạo bằng database.sql
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../database.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-supabase')) {
  console.error('❌ Lỗi: SUPABASE_URL chưa được cấu hình trong file .env');
  console.error('   Vui lòng cập nhật SUPABASE_URL trong backend/.env');
  process.exit(1);
}

if (!supabaseKey || supabaseKey.includes('placeholder') || supabaseKey.includes('your-supabase')) {
  console.error('❌ Lỗi: SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Deduplicate by unique field (item_id for products, id for others)
function deduplicateById<T extends Record<string, any>>(arr: T[], key: string = 'id'): T[] {
  const seen = new Set<any>();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

async function migrate() {
  console.log('🚀 Bắt đầu chuyển dữ liệu từ database.json lên Supabase...');
  console.log(`📁 Đọc file: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Không tìm thấy file database.json');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

  // Stats tracking
  const stats: Record<string, { total: number; inserted: number; skipped: number; errors: number }> = {};

  // Helper function to insert data into a Supabase table
  async function insertBatch(tableName: string, rows: any[], supabaseTableName?: string) {
    const targetTable = supabaseTableName || tableName;
    stats[targetTable] = { total: rows.length, inserted: 0, skipped: 0, errors: 0 };

    if (!rows || rows.length === 0) {
      console.log(`  ⏭️  ${targetTable}: Không có dữ liệu`);
      return;
    }

    console.log(`  📤 ${targetTable}: Đang chuyển ${rows.length} bản ghi...`);

    // Insert in batches of 50 to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from(targetTable)
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`  ❌ Lỗi ${targetTable} (batch ${Math.floor(i/batchSize) + 1}):`, error.message);
        stats[targetTable].errors += batch.length;
      } else {
        stats[targetTable].inserted += data?.length || 0;
      }
    }

    console.log(`  ✅ ${targetTable}: ${stats[targetTable].inserted} thành công, ${stats[targetTable].errors} lỗi`);
  }

  // ==========================================
  // MIGRATE EACH TABLE IN ORDER (respecting foreign keys)
  // ==========================================

  // 1. Suppliers
  const suppliers = rawData.suppliers || [];
  await insertBatch('suppliers', suppliers);

  // 2. Ingredients 
  const ingredients = rawData.ingredients || [];
  await insertBatch('ingredients', ingredients);

  // 3. Products (deduplicate by item_id - database.json has duplicates!)
  const products = deduplicateById(rawData.products || [], 'item_id');
  console.log(`  ℹ️  Products: ${rawData.products?.length || 0} bản ghi gốc → ${products.length} sau khi loại bỏ trùng lặp`);
  await insertBatch('products', products);

  // 4. Recipes
  const recipes = rawData.recipes || [];
  await insertBatch('recipes', recipes);

  // 5. Recipe Items
  const recipeItems = rawData.recipe_items || [];
  await insertBatch('recipe_items', recipeItems);

  // 6. Imports → inventory_imports (tên bảng khác!)
  const imports = rawData.imports || [];
  await insertBatch('imports', imports, 'inventory_imports');

  // 7. Import Items
  const importItems = rawData.import_items || [];
  await insertBatch('import_items', importItems);

  // 8. Exports → inventory_exports
  const exports = rawData.exports || [];
  await insertBatch('exports', exports, 'inventory_exports');

  // 9. Export Items
  const exportItems = rawData.export_items || [];
  await insertBatch('export_items', exportItems);

  // 10. Counts → inventory_counts
  const counts = rawData.counts || [];
  await insertBatch('counts', counts, 'inventory_counts');

  // 11. Count Items
  const countItems = rawData.count_items || [];
  await insertBatch('count_items', countItems);

  // 12. Sales
  const sales = rawData.sales || [];
  await insertBatch('sales', sales);

  // 13. Sale Items
  const saleItems = rawData.sale_items || [];
  await insertBatch('sale_items', saleItems);

  // 14. Logs
  const logs = rawData.logs || [];
  await insertBatch('logs', logs);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 KẾT QUẢ CHUYỂN DỮ LIỆU');
  console.log('='.repeat(60));
  
  let totalInserted = 0;
  let totalErrors = 0;

  for (const [table, s] of Object.entries(stats)) {
    const status = s.errors > 0 ? '⚠️' : '✅';
    console.log(`  ${status} ${table.padEnd(25)} | Tổng: ${String(s.total).padStart(5)} | OK: ${String(s.inserted).padStart(5)} | Lỗi: ${String(s.errors).padStart(3)}`);
    totalInserted += s.inserted;
    totalErrors += s.errors;
  }

  console.log('='.repeat(60));
  console.log(`  📈 Tổng cộng: ${totalInserted} bản ghi thành công, ${totalErrors} lỗi`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 Chuyển dữ liệu thành công! Tất cả dữ liệu đã được đưa lên Supabase.');
    console.log('   Bạn có thể kiểm tra tại: https://app.supabase.com → Table Editor');
  } else {
    console.log('\n⚠️  Có một số lỗi trong quá trình chuyển dữ liệu.');
    console.log('   Kiểm tra lại cấu trúc bảng trong Supabase và thử lại.');
  }
}

migrate().catch(err => {
  console.error('❌ Lỗi nghiêm trọng:', err);
  process.exit(1);
});
