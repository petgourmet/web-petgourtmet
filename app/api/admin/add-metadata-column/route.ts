import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 })
    }

    // Intentar agregar una columna metadata de tipo JSONB para almacenar datos del formulario
    // Nota: Esto requiere permisos de administrador en la base de datos
    
    const { data, error } = await supabaseAdmin.rpc('add_metadata_column_to_orders')

    if (error) {
      console.error('Error adding metadata column:', error)
      
      // Intentar una alternativa: usar el campo shipping_address para almacenar JSON
      const testData = {
        status: 'pending',
        total: 1,
        shipping_address: JSON.stringify({
          address: "Test address",
          formData: { test: true }
        })
      }

      const { data: testResult, error: testError } = await supabaseAdmin
        .from('orders')
        .insert(testData)
        .select()

      if (testError) {
        return NextResponse.json({ 
          error: "No se puede agregar columna metadata", 
          details: error,
          alternativeError: testError
        }, { status: 500 })
      }

      // Limpiar datos de prueba
      if (testResult && testResult.length > 0) {
        await supabaseAdmin
          .from('orders')
          .delete()
          .eq('id', testResult[0].id)
      }

      return NextResponse.json({ 
        success: true,
        message: "Usando shipping_address para almacenar datos del formulario",
        method: "shipping_address_json"
      })
    }

    return NextResponse.json({ 
      success: true,
      message: "Columna metadata agregada exitosamente",
      method: "metadata_column"
    })

  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno", details: error }, { status: 500 })
  }
}
