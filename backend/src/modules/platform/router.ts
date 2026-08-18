import { Router } from 'express';
import { requirePlatformAdmin } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateTenantSchema } from '../../contracts/index.js';
import { db } from '../shared.js';
import { throwIfSupabaseError } from '../../lib/supabase.js';

export const platformRouter = Router();

platformRouter.use(requirePlatformAdmin);

// Tenants CRUD
platformRouter.get('/tenants', asyncHandler(async (req, res) => {
  const { data, error } = await db(req).from('tenants').select('*');
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

platformRouter.post('/tenants', validateBody(CreateTenantSchema), asyncHandler(async (req, res) => {
  const { data, error } = await db(req)
    .from('tenants')
    .insert(req.body)
    .select()
    .single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

platformRouter.patch('/tenants/:id', asyncHandler(async (req, res) => {
  const { data, error } = await db(req)
    .from('tenants')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// Manage Admins
platformRouter.get('/admins', asyncHandler(async (req, res) => {
  const { data, error } = await db(req).from('platform_admins').select('*, profiles(*)');
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));
