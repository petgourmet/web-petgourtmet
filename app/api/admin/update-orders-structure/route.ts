import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not available' }, { status: 500 })
    }

    // Intentar agregar las columnas necesarias usando consultas SQL directas
    const queries = [
      {
        name: 'Add customer_name column',
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;`
      },
      {
        name: 'Add customer_email column', 
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;`
      },
      {
        name: 'Add customer_phone column',
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;`
      },
      {
        name: 'Add shipping_address column',
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;`
      },
      {
        name: 'Add form_data column',
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS form_data JSONB;`
      }
    ]

    const results = []
    
    for (const query of queries) {
      try {
        // Usar una consulta SQL cruda a través de la conexión
        const { error } = await supabaseAdmin
          .rpc('exec_sql', { sql: query.sql })
          
        if (error) {
          // Si la función no existe, intentamos crear las columnas de otra manera
          console.log(`Function exec_sql not available, trying alternative for: ${query.name}`)
          results.push({ 
            name: query.name, 
            success: false, 
            error: 'exec_sql function not available',
            note: 'Will try manual column creation'
          })
        } else {
          results.push({ name: query.name, success: true })
        }
      } catch (err) {
        console.error(`Error with query ${query.name}:`, err)
        results.push({ 
          name: query.name, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Si las funciones SQL no funcionan, intentemos crear una orden de prueba para verificar la estructura
    try {
      const testOrder = {
        id: `test-structure-${Date.now()}`,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '+1234567890',
        shipping_address: {
          street_name: 'Test Street',
          street_number: '123',
          city: 'Test City',
          state: 'Test State',
          zip_code: '12345',
          country: 'Test Country'
        },
        form_data: {
          test: true
        },
        status: 'test',
        payment_status: 'test',
        total: 0
      }

      const { error: insertError } = await supabaseAdmin
        .from('orders')
        .insert(testOrder)

      if (insertError) {
        results.push({
          name: 'Test insert with new columns',
          success: false,
          error: insertError.message,
          note: 'Columns may not exist yet'
        })
      } else {
        // Si la inserción fue exitosa, eliminar el registro de prueba
        await supabaseAdmin
          .from('orders')
          .delete()
          .eq('id', testOrder.id)
          
        results.push({
          name: 'Test insert with new columns',
          success: true,
          note: 'All columns exist and are working'
        })
      }
    } catch (testError) {
      results.push({
        name: 'Test insert with new columns',
        success: false,
        error: testError instanceof Error ? testError.message : 'Unknown test error'
      })
    }

    return NextResponse.json({
      message: 'Table structure verification completed',
      results
    })
  } catch (error) {
    console.error('Error updating orders table structure:', error)
    return NextResponse.json({ error: 'Failed to update table structure' }, { status: 500 })
  }
}
