import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 })
    }

    // Primero intentemos obtener una orden existente para ver la estructura
    const { data: existingOrders, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .limit(1)

    if (selectError) {
      console.error('Error selecting orders:', selectError)
    }

    // Intentar insertar una orden de prueba con ID como integer
    const testOrderData = {
      status: 'pending',
      total: 100
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(testOrderData)
      .select()

    if (error) {
      console.error('Test order error:', error)
      return NextResponse.json({ 
        error: "Error insertando orden", 
        details: error,
        testData: testOrderData,
        existingStructure: existingOrders?.[0] ? Object.keys(existingOrders[0]) : null
      }, { status: 400 })
    }

    // Si funciona, eliminar la orden de prueba
    if (data && data.length > 0) {
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', data[0].id)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Estructura básica válida",
      insertedData: data,
      availableFields: Object.keys(data[0] || {}),
      existingStructure: existingOrders?.[0] ? Object.keys(existingOrders[0]) : null
    })

  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno", details: error }, { status: 500 })
  }
}
