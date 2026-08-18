const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('--- Testing Read ---');
  const { data: cats, error: errRead } = await supabase.from('categories').select('*');
  console.log('Read categories error:', errRead);
  console.log('Read categories count:', cats ? cats.length : 0);
  console.log('Categories:', cats);

  console.log('--- Testing Insert ---');
  const { data: inserted, error: errInsert } = await supabase
    .from('categories')
    .insert({ tenant_id: '11111111-1111-4111-a111-111111111111', name: 'Test Category Node ' + Date.now() })
    .select();

  console.log('Insert error:', errInsert);
  console.log('Inserted data:', inserted);
}

test();
