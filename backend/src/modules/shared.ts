import type { Request } from 'express';
import { AppError } from '../lib/errors.js';

export function db(req: Request) {
  if (!req.supabase) {
    throw new Error('Supabase client not initialized');
  }
  return req.supabase;
}

export function tenantId(req: Request): string {
  const rawId = req.params.tenantId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    throw new AppError(400, 'validation_error', 'tenantId es requerido en la URL');
  }
  return id;
}

export async function assertPermission(req: Request, permission: string) {
  const tid = tenantId(req);
  const userId = req.auth?.id;
  
  if (!userId) {
    throw new AppError(401, 'unauthorized', 'No autenticado');
  }

  // Check if platform admin
  if ((req.auth as any)?.isPlatformAdmin) {
    return;
  }

  const { data, error } = await db(req).rpc('has_permission', {
    check_tenant_id: tid,
    required_permission: permission
  });

  if (error || data !== true) {
    throw new AppError(403, 'forbidden', `Permiso denegado: ${permission}`);
  }
}

export function requireData<T>(data: T | null, message = 'Recurso no encontrado'): T {
  if (!data) {
    throw new AppError(404, 'not_found', message);
  }
  return data;
}

export function nextCursor(data: any[], limit: number) {
  return data.length === limit ? data[data.length - 1].id : null;
}
