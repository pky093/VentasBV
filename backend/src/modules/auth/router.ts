import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validateBody } from '../../middleware/validate.js';
import { getAdminClient } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

authRouter.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const adminClient = getAdminClient();
  
  const { data, error } = await adminClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new AppError(401, 'unauthorized', 'Credenciales inválidas');
  }

  res.json({
    success: true,
    data: {
      session: data.session,
      user: data.user
    }
  });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AppError(401, 'unauthorized', 'No token');
  
  const refresh_token = authHeader.replace('Bearer ', '');
  const adminClient = getAdminClient();
  
  const { data, error } = await adminClient.auth.refreshSession({ refresh_token });
  
  if (error) throw new AppError(401, 'unauthorized', 'Token inválido');
  
  res.json({ success: true, data: { session: data.session } });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.auth!.id;
  const { data, error } = await req.supabase!.from('profiles').select('*').eq('id', userId).single();
  
  if (error) throw new AppError(404, 'not_found', 'Perfil no encontrado');
  
  res.json({ success: true, data });
}));
