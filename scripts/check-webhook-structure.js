const { createClient } = require('@supabase/supabase-js')

// Configurar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqhqjqxqjqxqjqx.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWebhookStructure() {
  console.log('🔍 Verificando estructura de tablas de webhooks...')
  
  try {
    // 1. Verificar si existe webhook_logs
    console.log('\n1️⃣ Verificando tabla webhook_logs...')
    const { data: webhookLogsData, error: webhookLogsError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1)
    
    if (webhookLogsError) {
      console.log('❌ Error con webhook_logs:', webhookLogsError.message)
      console.log('   Código:', webhookLogsError.code)
      console.log('   Detalles:', webhookLogsError.details)
    } else {
      console.log('✅ Tabla webhook_logs existe')
      if (webhookLogsData && webhookLogsData.length > 0) {
        console.log('📋 Estructura de webhook_logs:')
        const sample = webhookLogsData[0]
        Object.keys(sample).forEach(key => {
          console.log(`   • ${key}: ${typeof sample[key]}`)
        })
      }
    }
    
    // 2. Verificar si existe mercadopago_webhooks
    console.log('\n2️⃣ Verificando tabla mercadopago_webhooks...')
    const { data: mpWebhooksData, error: mpWebhooksError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .limit(1)
    
    if (mpWebhooksError) {
      console.log('❌ Error con mercadopago_webhooks:', mpWebhooksError.message)
      console.log('   Código:', mpWebhooksError.code)
      console.log('   Detalles:', mpWebhooksError.details)
    } else {
      console.log('✅ Tabla mercadopago_webhooks existe')
      if (mpWebhooksData && mpWebhooksData.length > 0) {
        console.log('📋 Estructura de mercadopago_webhooks:')
        const sample = mpWebhooksData[0]
        Object.keys(sample).forEach(key => {
          console.log(`   • ${key}: ${typeof sample[key]}`)
        })
      }
    }
    
    // 3. Listar todas las tablas disponibles
    console.log('\n3️⃣ Listando todas las tablas disponibles...')
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names')
      .select()
    
    if (tablesError) {
      console.log('ℹ️ No se pudo obtener lista de tablas:', tablesError.message)
      
      // Intentar método alternativo
      console.log('\n   Intentando método alternativo...')
      const { data: altTables, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (altError) {
        console.log('ℹ️ Método alternativo falló:', altError.message)
      } else {
        console.log('📋 Tablas encontradas:')
        altTables?.forEach(table => {
          console.log(`   • ${table.table_name}`)
        })
      }
    } else {
      console.log('📋 Tablas encontradas:')
      tables?.forEach(table => {
        console.log(`   • ${table}`)
      })
    }
    
    // 4. Buscar tablas que contengan "webhook" en el nombre
    console.log('\n4️⃣ Buscando tablas relacionadas con webhooks...')
    
    const possibleTables = [
      'webhook_logs',
      'webhooks',
      'mercadopago_webhooks',
      'mp_webhooks',
      'payment_webhooks',
      'webhook_events',
      'webhook_history'
    ]
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (!error) {
          console.log(`✅ Tabla ${tableName} existe`)
          if (data && data.length > 0) {
            console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}`)
          }
        }
      } catch (e) {
        // Tabla no existe, continuar
      }
    }
    
    // 5. Verificar errores de webhook recientes
    console.log('\n5️⃣ Verificando errores de webhook recientes...')
    
    try {
      const { data: errorLogs, error: errorLogsError } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (errorLogsError) {
        console.log('❌ Error obteniendo logs de error:', errorLogsError.message)
      } else {
        console.log(`📊 Errores de webhook encontrados: ${errorLogs?.length || 0}`)
        
        if (errorLogs && errorLogs.length > 0) {
          errorLogs.forEach((log, index) => {
            console.log(`\n   ${index + 1}. Error en ${new Date(log.created_at).toLocaleString()}`)
            console.log(`      Tipo: ${log.webhook_type || 'N/A'}`)
            console.log(`      Error: ${log.error_message || 'Sin mensaje'}`)
            
            if (log.webhook_data) {
              try {
                const data = typeof log.webhook_data === 'string' 
                  ? JSON.parse(log.webhook_data) 
                  : log.webhook_data
                console.log(`      External Ref: ${data.external_reference || 'N/A'}`)
              } catch (e) {
                console.log(`      ⚠️ Error parseando datos`)
              }
            }
          })
        }
      }
    } catch (e) {
      console.log('ℹ️ No se pudo verificar errores de webhook')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar verificación
checkWebhookStructure().then(() => {
  console.log('\n✅ Verificación de estructura completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando verificación:', error.message)
  process.exit(1)
})