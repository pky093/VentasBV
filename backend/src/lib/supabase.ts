import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export function createPublicClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
}

export function createUserClient(authHeader: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

export function getAdminClient() {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_SECRET_KEY no configurada');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

export function throwIfSupabaseError(result: { error: any }) {
  if (result.error) {
    if (result.error.code === 'PGRST116') {
      throw new AppError(404, 'not_found', 'Recurso no encontrado');
    }
    if (result.error.code === '23505') {
      throw new AppError(409, 'conflict', 'El recurso ya existe');
    }
    throw new AppError(500, 'database_error', result.error.message || 'Error de base de datos');
  }
}
