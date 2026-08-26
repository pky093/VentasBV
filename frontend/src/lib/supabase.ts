import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bpsqdubdxcklbyninvjg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3FkdWJkeGNrbGJ5bmludmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTU4MTksImV4cCI6MjEwMjQ5MTgxOX0.uDZ5CaDz5EirbM3_e_pAGdPmqeGLmTn0uF9Q8h-AwKk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_TENANT_ID = '11111111-1111-4111-a111-111111111111';
export const DEFAULT_BRANCH_ID = '22222222-2222-4222-a222-222222222222';

export const getActiveTenantId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tenant_id') || DEFAULT_TENANT_ID;
  }
  return DEFAULT_TENANT_ID;
};

export const getActiveBranchId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('active_branch_id') || DEFAULT_BRANCH_ID;
  }
  return DEFAULT_BRANCH_ID;
};

