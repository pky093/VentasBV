import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      auth?: User;
      supabase?: SupabaseClient;
    }
  }
}
