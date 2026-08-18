import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_TENANT_ID = '11111111-1111-4111-a111-111111111111';
export const DEFAULT_BRANCH_ID = '22222222-2222-4222-a222-222222222222';
