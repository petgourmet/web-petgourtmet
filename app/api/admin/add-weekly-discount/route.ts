import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(request: NextRequest) {
  try {
    console.log('Agregando columna weekly_discount...')

    // Intentar agregar la columna weekly_discount usando una inserción temporal
    // Como no podemos usar ALTER TABLE directamente, vamos a intentar un enfoque diferente
    
    // Primero verificar si la columna ya existe
    const { data: testData, error: testError } = await supabaseAdmin
      .from('products')
      .select('weekly_discount')
      .limit(1)

    if (!testError) {
      // La columna ya existe
      console.log('✅ La columna weekly_discount ya existe')
      return NextResponse.json({
        success: true,
        message: 'La columna weekly_discount ya existe en la tabla products',
        column_exists: true
      })
    }

    // Si llegamos aquí, la columna no existe
    console.log('⚠️ La columna weekly_discount no existe, se requiere migración manual')
    
    return NextResponse.json({
      success: false,
      message: 'La columna weekly_discount no existe. Se requiere ejecutar la migración SQL manualmente.',
      sql_command: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS weekly_discount NUMERIC(5,2);',
      instructions: [
        '1. Accede a tu panel de Supabase',
        '2. Ve a la sección SQL Editor',
        '3. Ejecuta el comando SQL proporcionado',
        '4. Vuelve a ejecutar esta API para verificar'
      ]
    }, { status: 400 })

  } catch (error) {
    console.error('Error al verificar/agregar columna weekly_discount:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: String(error)
      },
      { status: 500 }
    )
  }
}