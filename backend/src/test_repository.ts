import { InventoryRepository, IngredientRepository, SupplierRepository } from './repositories/db.repository.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    console.log("=== RUNNING REPOSITORY TEST ===");
    
    // 1. Get or create a supplier
    let suppliers = await SupplierRepository.getAll();
    if (suppliers.length === 0) {
      console.log("No suppliers. Let's try to add a supplier...");
      // Wait, SupplierRepository has no save method? Let's check db.repository.ts for SupplierRepository.
      // Ah, SupplierRepository only has getAll(). Let's use direct supabase query to insert a mock supplier.
      const { supabase } = await import('./config/supabase.js');
      const { data, error } = await supabase.from('suppliers').insert({ name: 'Nhà cung cấp thử nghiệm' }).select().single();
      if (error) {
        console.error("Failed to insert mock supplier:", error);
      } else {
        console.log("Inserted mock supplier:", data);
        suppliers = [data];
      }
    }

    // 2. Get ingredients
    let ingredients = await IngredientRepository.getAll();
    if (ingredients.length === 0) {
      console.log("No ingredients. Inserting mock ingredient...");
      const mockIng = await IngredientRepository.save({
        name: 'Nguyên liệu thử nghiệm',
        unit: 'Kg',
        cost_price: 15000,
        current_stock: 5,
        min_stock: 1,
        supplier_id: suppliers[0]?.id
      });
      console.log("Inserted mock ingredient:", mockIng);
      ingredients = [mockIng];
    }

    // 3. Test addImport
    console.log("Testing InventoryRepository.addImport...");
    try {
      const imp = await InventoryRepository.addImport(
        {
          supplier_id: suppliers[0]?.id,
          total_cost: 30000,
          note: "Repository test import",
          user_id: "usr-1"
        },
        [
          {
            ingredient_id: ingredients[0].id,
            quantity: 2,
            unit_cost: 15000,
            total_cost: 30000
          }
        ]
      );
      console.log("Import success:", imp);
    } catch (e: any) {
      console.error("Import failed with error:", e);
    }

    // 4. Test addExport
    console.log("Testing InventoryRepository.addExport...");
    try {
      const exp = await InventoryRepository.addExport(
        {
          note: "Repository test export",
          user_id: "usr-1",
          total_value: 15000
        },
        [
          {
            ingredient_id: ingredients[0].id,
            quantity: 1,
            reason: "Waste",
            unit_cost: 15000,
            total_cost: 15000
          }
        ]
      );
      console.log("Export success:", exp);
    } catch (e: any) {
      console.error("Export failed with error:", e);
    }

  } catch (err) {
    console.error("Global test error:", err);
  }
}

test();
