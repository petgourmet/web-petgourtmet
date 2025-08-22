import pg from 'pg'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const { Client } = pg

// Extraer información de conexión de la URL de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error('❌ Error: Variables de entorno requeridas no encontradas')
  console.log('Necesitas:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_DB_PASSWORD')
  process.exit(1)
}

// Extraer el host del proyecto de la URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
const host = `db.${projectRef}.supabase.co`

const client = new Client({
  host: host,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: {
    rejectUnauthorized: false
  }
})

async function addCustomerEmailColumn() {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await client.connect()
    console.log('✅ Conectado exitosamente')
    
    // Verificar si la columna ya existe
    console.log('🔍 Verificando si la columna customer_email existe...')
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'customer_email'
    `
    
    const checkResult = await client.query(checkQuery)
    
    if (checkResult.rows.length > 0) {
      console.log('✅ La columna customer_email ya existe')
      return true
    }
    
    console.log('📝 La columna customer_email no existe, agregándola...')
    
    // Agregar la columna
    const addColumnQuery = 'ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255)'
    await client.query(addColumnQuery)
    
    console.log('✅ Columna customer_email agregada exitosamente')
    
    // Verificar que se agregó correctamente
    const verifyResult = await client.query(checkQuery)
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verificación exitosa: La columna customer_email está disponible')
      return true
    } else {
      console.error('❌ Error: La columna no se agregó correctamente')
      return false
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message)
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 Solución: Verifica que SUPABASE_DB_PASSWORD sea correcta')
      console.log('   Puedes encontrarla en: Supabase Dashboard > Settings > Database > Connection string')
    } else if (error.message.includes('connection')) {
      console.log('💡 Solución: Verifica la conexión a internet y que el proyecto de Supabase esté activo')
    }
    
    return false
  } finally {
    await client.end()
    console.log('🔌 Conexión cerrada')
  }
}

// Ejecutar la migración
addCustomerEmailColumn()
  .then((success) => {
    if (success) {
      console.log('🎉 Migración completada exitosamente')
      console.log('🔄 Ahora puedes intentar crear órdenes nuevamente')
      process.exit(0)
    } else {
      console.log('⚠️ Migración falló - se requiere intervención manual')
      console.log('📋 SOLUCIÓN MANUAL:')
      console.log('1. Ve a https://supabase.com/dashboard')
      console.log('2. Selecciona tu proyecto')
      console.log('3. Ve a Database > SQL Editor')
      console.log('4. Ejecuta: ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { addCustomerEmailColumn }