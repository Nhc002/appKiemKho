import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('*');
    console.log('Suppliers:', suppliers, sErr);

    const { data: ingredients, error: iErr } = await supabase.from('ingredients').select('*');
    console.log('Ingredients:', ingredients, iErr);

    const { data: imports, error: impErr } = await supabase.from('inventory_imports').select('*');
    console.log('Imports:', imports, impErr);

    const { data: importItems, error: iiErr } = await supabase.from('import_items').select('*');
    console.log('Import Items:', importItems, iiErr);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
