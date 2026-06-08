const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vugyxfgvnzpgpenfcgtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Z3l4Zmd2bnpwZ3BlbmZjZ3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTYwMzcsImV4cCI6MjA5NjQzMjAzN30.hd8XUi-dpObO3qWXAYLFVnDHMxsQd0V0kMBCpJvu_ps';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('Probando lectura de tablas en public schema...');
  
  // Probar catalogos
  console.log('Intentando leer tabla catalogos...');
  const { data: catData, error: catError } = await supabase
    .from('catalogos')
    .select('*')
    .limit(1);

  if (catError) {
    console.error('❌ Error en catalogos:', catError);
  } else {
    console.log('✅ Lectura de catalogos exitosa:', catData);
  }

  // Probar expedientes
  console.log('Intentando leer tabla expedientes...');
  const { data: expData, error: expError } = await supabase
    .from('expedientes')
    .select('id')
    .limit(1);

  if (expError) {
    console.error('❌ Error en expedientes:', expError);
  } else {
    console.log('✅ Lectura de expedientes exitosa:', expData);
  }
}

runDiagnostics();
