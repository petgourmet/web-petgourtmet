import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  console.log('Verifica que .env.local contenga:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkOrdersTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla orders...')
    
    // Intentar hacer una consulta que incluya customer_email
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_email')
      .limit(1)
    
    if (error) {
      if (error.message.includes('customer_email')) {
        console.log('❌ PROBLEMA CONFIRMADO: La columna customer_email no existe')
        console.log('')
        console.log('🔧 SOLUCIÓN REQUERIDA:')
        console.log('1. Ve al dashboard de Supabase: https://supabase.com/dashboard')
        console.log('2. Selecciona tu proyecto')
        console.log('3. Ve a Database > SQL Editor')
        console.log('4. Crea una nueva consulta y pega este SQL:')
        console.log('')
        console.log('   ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);')
        console.log('')
        console.log('5. Haz clic en "Run" para ejecutar')
        console.log('6. Verifica que aparezca "Success. No rows returned"')
        console.log('')
        console.log('📋 ALTERNATIVA - Usar la interfaz gráfica:')
        console.log('1. Ve a Database > Tables > orders')
        console.log('2. Haz clic en "Add Column"')
        console.log('3. Nombre: customer_email')
        console.log('4. Tipo: varchar')
        console.log('5. Longitud: 255')
        console.log('6. Nullable: ✓ (marcado)')
        console.log('7. Guarda los cambios')
        console.log('')
        return false
      } else {
        console.error('❌ Error inesperado:', error)
        return false
      }
    } else {
      console.log('✅ ¡Excelente! La columna customer_email ya existe')
      console.log('🔄 El problema de creación de órdenes debería estar resuelto')
      return true
    }
    
  } catch (error) {
    console.error('❌ Error verificando tabla:', error.message)
    return false
  }
}

// Función para probar la creación de una orden de prueba
async function testOrderCreation() {
  try {
    console.log('🧪 Probando creación de orden de prueba...')
    
    const testOrder = {
      status: 'pending',
      payment_status: 'pending',
      total: 100,
      user_id: null,
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_phone: '1234567890',
      shipping_address: JSON.stringify({
        street: 'Test Street 123',
        city: 'Test City',
        state: 'Test State',
        zip: '12345'
      }),
      payment_intent_id: 'test_' + Date.now()
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
    
    if (error) {
      console.error('❌ Error en prueba de creación:', error)
      return false
    } else {
      console.log('✅ ¡Prueba exitosa! Orden de prueba creada con ID:', data[0]?.id)
      
      // Limpiar la orden de prueba
      await supabase
        .from('orders')
        .delete()
        .eq('id', data[0]?.id)
      
      console.log('🧹 Orden de prueba eliminada')
      return true
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message)
    return false
  }
}

// Ejecutar verificaciones
async function main() {
  console.log('🚀 Iniciando verificación de la tabla orders...')
  console.log('')
  
  const tableOk = await checkOrdersTable()
  
  if (tableOk) {
    console.log('')
    const testOk = await testOrderCreation()
    
    if (testOk) {
      console.log('')
      console.log('🎉 ¡TODO ESTÁ FUNCIONANDO CORRECTAMENTE!')
      console.log('✅ La tabla orders tiene la columna customer_email')
      console.log('✅ La creación de órdenes funciona sin errores')
      console.log('🔄 Puedes intentar crear una orden real ahora')
    }
  }
  
  console.log('')
  console.log('📞 Si necesitas ayuda adicional:')
  console.log('   - Verifica que tengas permisos de administrador en Supabase')
  console.log('   - Asegúrate de estar en el proyecto correcto')
  console.log('   - Contacta al administrador de la base de datos si persisten los problemas')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { checkOrdersTable, testOrderCreation }