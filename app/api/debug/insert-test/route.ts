import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `insert_test_${Date.now()}`
  
  try {
    console.log(`=== ORDER INSERTION TEST [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    
    const supabase = await createClient()
    
    // Test 1: Verificar estructura de tabla
    console.log("1. Checking table structure...")
    const { data: tableData, error: structureError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (structureError) {
      console.error("❌ Table structure check failed:", structureError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Table structure check failed",
        details: structureError
      }, { status: 500 })
    }
    
    console.log("✅ Table accessible. Sample data:", tableData)
    
    // Test 2: Inserción muy básica (solo campos requeridos)
    console.log("2. Testing minimal insertion...")
    const minimalData = {
      status: 'pending',
      total: 100.00
    }
    
    const { data: minimalInsert, error: minimalError } = await supabase
      .from('orders')
      .insert(minimalData)
      .select()
    
    if (minimalError) {
      console.error("❌ Minimal insertion failed:", minimalError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Minimal insertion failed",
        details: minimalError,
        attempted_data: minimalData
      }, { status: 500 })
    }
    
    console.log("✅ Minimal insertion successful:", minimalInsert)
    
    // Test 3: Inserción con más campos
    console.log("3. Testing extended insertion...")
    const extendedData = {
      status: 'pending',
      payment_status: 'pending',
      total: 200.00,
      customer_name: 'Test User',
      customer_phone: '1234567890'
    }
    
    const { data: extendedInsert, error: extendedError } = await supabase
      .from('orders')
      .insert(extendedData)
      .select()
    
    if (extendedError) {
      console.error("❌ Extended insertion failed:", extendedError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Extended insertion failed",
        details: extendedError,
        attempted_data: extendedData
      }, { status: 500 })
    }
    
    console.log("✅ Extended insertion successful:", extendedInsert)
    
    // Test 4: Inserción con shipping_address JSON
    console.log("4. Testing full insertion with shipping_address...")
    const fullData = {
      status: 'pending',
      payment_status: 'pending',
      total: 300.00,
      customer_name: 'Test Full User',
      customer_phone: '1234567890',
      shipping_address: JSON.stringify({
        order_number: `TEST_${Date.now()}`,
        customer_data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '1234567890'
        }
      })
    }
    
    const { data: fullInsert, error: fullError } = await supabase
      .from('orders')
      .insert(fullData)
      .select()
    
    if (fullError) {
      console.error("❌ Full insertion failed:", fullError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Full insertion failed",
        details: fullError,
        attempted_data: fullData
      }, { status: 500 })
    }
    
    console.log("✅ Full insertion successful:", fullInsert)
    
    // Cleanup: Eliminar las órdenes de prueba
    const insertedIds = [
      ...(minimalInsert || []),
      ...(extendedInsert || []),
      ...(fullInsert || [])
    ].map(order => order.id)
    
    if (insertedIds.length > 0) {
      console.log("5. Cleaning up test orders...")
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', insertedIds)
      
      if (deleteError) {
        console.error("⚠️ Cleanup failed:", deleteError)
      } else {
        console.log("✅ Cleanup successful")
      }
    }
    
    console.log(`=== ORDER INSERTION TEST COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Order insertion test completed successfully",
      test_results: {
        table_access: "✅ Success",
        minimal_insertion: "✅ Success",
        extended_insertion: "✅ Success",
        full_insertion: "✅ Success",
        cleanup: insertedIds.length > 0 ? "✅ Success" : "N/A"
      },
      inserted_orders: {
        minimal: minimalInsert?.[0]?.id,
        extended: extendedInsert?.[0]?.id,
        full: fullInsert?.[0]?.id
      }
    })
    
  } catch (error) {
    console.error("❌ ORDER INSERTION TEST FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Order insertion test failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Order Insertion Test",
    description: "Tests different levels of order insertion to identify field issues",
    timestamp: new Date().toISOString()
  })
}
