import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bpsqdubdxcklbyninvjg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3FkdWJkeGNrbGJ5bmludmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTU4MTksImV4cCI6MjEwMjQ5MTgxOX0.uDZ5CaDz5EirbM3_e_pAGdPmqeGLmTn0uF9Q8h-AwKk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
export const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000000';

let cachedPublicTenantId = '';

export const getActiveTenantId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tenant_id') || cachedPublicTenantId || '';
  }
  return cachedPublicTenantId || '';
};

export const resolveTenantId = async (): Promise<string> => {
  const current = getActiveTenantId();
  if (current) return current;
  if (cachedPublicTenantId) return cachedPublicTenantId;

  try {
    const { data } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (data?.id) {
      cachedPublicTenantId = data.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_id', data.id);
      }
      return data.id;
    }
  } catch (e) {
    console.warn('Error resolving public tenant ID:', e);
  }
  return '';
};

export const getActiveBranchId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('active_branch_id') || '';
  }
  return '';
};
