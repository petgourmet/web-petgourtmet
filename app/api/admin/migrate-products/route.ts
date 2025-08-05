import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Variables de entorno de Supabase no configuradas" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Ejecutando migración de productos...")

    // Ejecutar cada ALTER TABLE por separado
    const alterCommands = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_type VARCHAR(10) DEFAULT 'unit'",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_reference TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_available BOOLEAN DEFAULT false",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_types JSONB DEFAULT '[]'::jsonb",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS weekly_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS biweekly_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS quarterly_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS annual_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS weekly_mercadopago_url TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS biweekly_mercadopago_url TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_mercadopago_url TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS quarterly_mercadopago_url TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS annual_mercadopago_url TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_types JSONB DEFAULT '[\"single\"]'::jsonb",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_discount NUMERIC(5,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_info JSONB DEFAULT '{}'::jsonb"
    ]

    const results = []
    let hasErrors = false

    // Verificar qué columnas ya existen intentando hacer una consulta simple
     try {
       // Intentar obtener una fila de la tabla products para ver qué columnas existen
       const { data: sampleData, error: sampleError } = await supabaseAdmin
         .from('products')
         .select('*')
         .limit(1)

       if (sampleError) {
         console.error('Error al consultar tabla products:', sampleError)
         return NextResponse.json(
           { success: false, error: `Error al consultar tabla products: ${sampleError.message}` },
           { status: 500 }
         )
       }

       const existingColumnNames = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
       console.log('Columnas existentes en products:', existingColumnNames)

       // Lista de columnas que queremos agregar
       const expectedColumns = [
         'sale_type', 'weight_reference', 'subscription_available', 'subscription_types',
         'weekly_discount', 'biweekly_discount', 'monthly_discount', 'quarterly_discount', 'annual_discount',
         'weekly_mercadopago_url', 'biweekly_mercadopago_url', 'monthly_mercadopago_url', 
         'quarterly_mercadopago_url', 'annual_mercadopago_url',
         'purchase_types', 'subscription_discount', 'average_rating', 'review_count', 'nutrition_info'
       ]

       const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col))
       const existingNewColumns = expectedColumns.filter(col => existingColumnNames.includes(col))

       results.push({
         type: 'schema_check',
         success: true,
         message: `Verificación completada. ${existingNewColumns.length} columnas ya existen, ${missingColumns.length} faltan por agregar`,
         existing: existingNewColumns,
         missing: missingColumns,
         all_columns: existingColumnNames
       })

       if (missingColumns.length === 0) {
         console.log('✅ Todas las columnas requeridas ya existen en la tabla products')
         results.push({
           type: 'migration_complete',
           success: true,
           message: 'No se requiere migración - todas las columnas ya están presentes'
         })
       } else {
         console.log(`⚠️ Faltan ${missingColumns.length} columnas por agregar:`, missingColumns)
         results.push({
           type: 'migration_needed',
           success: false,
           message: `Se requiere agregar ${missingColumns.length} columnas manualmente en la base de datos`,
           missing_columns: missingColumns,
           sql_commands: alterCommands.filter((cmd, index) => {
             // Filtrar solo los comandos para las columnas que faltan
             const columnName = expectedColumns[index]
             return missingColumns.includes(columnName)
           })
         })
         hasErrors = true
       }

     } catch (err) {
       console.error('Error inesperado:', err)
       hasErrors = true
       results.push({ type: 'error', success: false, error: String(err) })
     }

    // Crear índices para mejorar el rendimiento si no hubo errores críticos
    if (!hasErrors) {
      const indexCommands = [
        "CREATE INDEX IF NOT EXISTS idx_products_sale_type ON products(sale_type)",
        "CREATE INDEX IF NOT EXISTS idx_products_subscription_available ON products(subscription_available)",
        "CREATE INDEX IF NOT EXISTS idx_products_subscription_types ON products USING GIN(subscription_types)",
        "CREATE INDEX IF NOT EXISTS idx_products_purchase_types ON products USING GIN(purchase_types)"
      ]

      for (let i = 0; i < indexCommands.length; i++) {
        try {
          const { error } = await supabaseAdmin.rpc('exec', { sql: indexCommands[i] })
          if (error) {
            console.warn(`Advertencia al crear índice ${i + 1}:`, error)
            results.push({ index: i + 1, success: false, error: error.message, type: 'index' })
          } else {
            results.push({ index: i + 1, success: true, type: 'index' })
          }
        } catch (err) {
          console.warn(`Error inesperado al crear índice ${i + 1}:`, err)
          results.push({ index: i + 1, success: false, error: String(err), type: 'index' })
        }
      }
    }

    const successfulCommands = results.filter(r => r.success).length
    const totalCommands = results.length

    console.log(`Migración completada: ${successfulCommands}/${totalCommands} comandos exitosos`)

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? `Migración completada con errores: ${successfulCommands}/${totalCommands} comandos exitosos`
        : "Migración de productos ejecutada exitosamente",
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error inesperado:", error)
    return NextResponse.json(
      { success: false, error: `Error inesperado: ${error}` },
      { status: 500 }
    )
  }
}