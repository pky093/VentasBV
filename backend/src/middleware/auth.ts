import { AppError } from '../lib/errors.js';
import { createUserClient } from '../lib/supabase.js';
import { asyncHandler } from '../lib/async-handler.js';
import { createPublicClient } from '../lib/supabase.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError(401, 'unauthorized', 'Falta token de autenticación');
  }

  const supabase = createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AppError(401, 'unauthorized', 'Token inválido o expirado');
  }

  req.auth = data.user;
  req.supabase = supabase;
  next();
});

export const requirePlatformAdmin = asyncHandler(async (req, res, next) => {
  if (!req.auth || !req.supabase) {
    throw new AppError(401, 'unauthorized', 'Autenticación requerida');
  }

  const { data, error } = await req.supabase
    .from('platform_admins')
    .select('*')
    .eq('user_id', req.auth.id)
    .single();

  if (error || !data) {
    throw new AppError(403, 'forbidden', 'Se requieren permisos de administrador de plataforma');
  }

  next();
});
