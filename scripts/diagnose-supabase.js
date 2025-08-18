const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Función para leer variables de entorno
function loadEnvVars() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envLocalPath = path.join(__dirname, '..', '.env');
  
  let envVars = {};
  
  // Intentar leer .env.local primero
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
  }
  
  // Luego .env
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !envVars[key.trim()]) {
        envVars[key.trim()] = value.trim();
      }
    });
  }
  
  return envVars;
}

async function diagnoseSupabase() {
  console.log('🔍 Iniciando diagnóstico de Supabase...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar variables de entorno
    console.log('\n1. 📋 Verificando variables de entorno...');
    const envVars = loadEnvVars();
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    let missingVars = [];
    requiredVars.forEach(varName => {
      if (envVars[varName]) {
        console.log(`   ✅ ${varName}: ${varName.includes('KEY') ? '[OCULTA]' : envVars[varName]}`);
      } else {
        console.log(`   ❌ ${varName}: NO ENCONTRADA`);
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`\n❌ Variables faltantes: ${missingVars.join(', ')}`);
      return;
    }
    
    // 2. Crear cliente de Supabase
    console.log('\n2. 🔗 Creando cliente de Supabase...');
    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    console.log('   ✅ Cliente creado exitosamente');
    
    // 3. Verificar conectividad básica
    console.log('\n3. 🌐 Verificando conectividad...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.log(`   ❌ Error de conectividad: ${error.message}`);
      } else {
        console.log('   ✅ Conectividad exitosa');
      }
    } catch (err) {
      console.log(`   ❌ Error de red: ${err.message}`);
    }
    
    // 4. Verificar autenticación actual
    console.log('\n4. 🔐 Verificando estado de autenticación...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log(`   ❌ Error obteniendo sesión: ${sessionError.message}`);
    } else if (session) {
      console.log(`   ✅ Sesión activa para usuario: ${session.user.email}`);
      console.log(`   📅 Expira: ${new Date(session.expires_at * 1000).toLocaleString()}`);
    } else {
      console.log('   ⚠️  No hay sesión activa');
    }
    
    // 5. Verificar acceso a tablas principales
    console.log('\n5. 🗄️  Verificando acceso a tablas...');
    const tables = ['profiles', 'orders', 'subscriptions', 'products', 'blogs'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: Acceso exitoso (${data?.length || 0} registros)`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Error de red - ${err.message}`);
      }
    }
    
    // 6. Verificar RLS (Row Level Security)
    console.log('\n6. 🛡️  Verificando políticas RLS...');
    const supabaseAdmin = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY
    );
    
    try {
      const { data: policies, error: policiesError } = await supabaseAdmin
        .from('pg_policies')
        .select('*')
        .in('tablename', tables);
        
      if (policiesError) {
        console.log(`   ❌ Error consultando políticas: ${policiesError.message}`);
      } else {
        console.log(`   ✅ Políticas RLS encontradas: ${policies?.length || 0}`);
        policies?.forEach(policy => {
          console.log(`     - ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Error verificando RLS: ${err.message}`);
    }
    
    // 7. Verificar permisos de roles
    console.log('\n7. 👥 Verificando permisos de roles...');
    try {
      const { data: grants, error: grantsError } = await supabaseAdmin
        .from('information_schema.role_table_grants')
        .select('*')
        .eq('table_schema', 'public')
        .in('grantee', ['anon', 'authenticated'])
        .in('table_name', tables);
        
      if (grantsError) {
        console.log(`   ❌ Error consultando permisos: ${grantsError.message}`);
      } else {
        console.log(`   ✅ Permisos encontrados: ${grants?.length || 0}`);
        grants?.forEach(grant => {
          console.log(`     - ${grant.table_name}: ${grant.grantee} -> ${grant.privilege_type}`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Error verificando permisos: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar diagnóstico
diagnoseSupabase().catch(console.error);