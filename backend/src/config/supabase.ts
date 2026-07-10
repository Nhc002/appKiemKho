import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const isSupabaseConfigured =
  supabaseUrl &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseServiceKey &&
  !supabaseServiceKey.includes('your-supabase-service-role-key') &&
  !supabaseServiceKey.includes('placeholder-key');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : new Proxy({} as any, {
    get(target, prop) {
      return () => {
        throw new Error('Supabase not configured - using local database fallback.');
      };
    }
  });
