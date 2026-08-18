import 'dotenv/config';
import { getAdminClient } from '../lib/supabase.js';
import { randomUUID } from 'crypto';

async function bootstrap() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: pnpm bootstrap:admin <email>');
    process.exit(1);
  }

  console.log(`Bootstrapping admin for ${email}...`);
  const supabase = getAdminClient();

  // Find user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;

  const user = users.users.find((u) => u.email === email);
  if (!user) {
    console.error('Usuario no encontrado');
    process.exit(1);
  }

  // Insert profile if not exists
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email, full_name: 'Platform Admin' });
  if (profileError) throw profileError;

  // Insert platform admin
  const { error: adminError } = await supabase
    .from('platform_admins')
    .upsert({ user_id: user.id });
  if (adminError) throw adminError;

  console.log('✅ Admin creado exitosamente');
}

bootstrap().catch(console.error);
