const fs = require('fs');

async function run() {
  const envPath = 'c:/Users/USER/Desktop/1. Antigravity/5. IA-FAM/.env.local';
  const envContent = fs.readFileSync(envPath, 'utf8');

  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  });

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const { createClient } = require('c:/Users/USER/Desktop/1. Antigravity/5. IA-FAM/node_modules/@supabase/supabase-js');
  const supabase = createClient(url, serviceKey);

  console.log('Querying FAM-FS-2026-054 details...');
  const { data, error } = await supabase
    .from('expedientes')
    .select('*')
    .eq('numero_expediente', 'FAM-FS-2026-054')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
