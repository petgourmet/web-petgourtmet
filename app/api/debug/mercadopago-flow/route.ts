import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `mp_debug_${Date.now()}`
  
  try {
    console.log(`=== MERCADOPAGO FLOW DEBUG TEST [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    
    // Simular datos del formulario como llegarían del frontend
    const mockFormData = {
      orderData: {
        customer_data: {
          firstName: 'TestMP',
          lastName: 'User',
          email: 'test-mp@petgourmet.com',
          phone: '5555555555',
          address: {
            street_name: 'Av Test MercadoPago',
            street_number: '100',
            zip_code: '01000',
            city: 'Ciudad de México',
            state: 'CDMX'
          }
        },
        items: [{
          id: 'mp-test-item',
          title: 'Test MercadoPago Product',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none'
      }
    }
    
    console.log("1. Mock form data received:", JSON.stringify(mockFormData, null, 2))
    
    const supabase = await createClient()
    
    // 2. Crear la orden en la base de datos (como en el flujo real)
    console.log("2. Creating order in database...")
    const orderNumber = `MP_TEST_${Date.now()}`
    
    const orderDataForDB = {
      status: 'pending',
      payment_status: 'pending',
      total: mockFormData.orderData.subtotal,
      user_id: null,
      customer_name: `${mockFormData.orderData.customer_data.firstName} ${mockFormData.orderData.customer_data.lastName}`,
      customer_phone: mockFormData.orderData.customer_data.phone,
      shipping_address: JSON.stringify({
        order_number: orderNumber,
        customer_data: mockFormData.orderData.customer_data,
        items: mockFormData.orderData.items,
        subtotal: mockFormData.orderData.subtotal,
        frequency: mockFormData.orderData.frequency,
        created_at: timestamp,
        debug_test: true,
        debug_id: debugId
      }),
      payment_intent_id: null // Se actualizará después
    }
    
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderDataForDB)
      .select()
      .single()
    
    if (orderError) {
      console.error("❌ Order creation failed:", orderError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Order creation failed",
        details: orderError,
        step: "order_creation",
        testData: orderDataForDB
      }, { status: 500 })
    }
    
    console.log("✅ Order created successfully:", createdOrder)
    
    // 3. Simular la verificación de variables de entorno de MercadoPago
    console.log("3. Checking MercadoPago environment variables...")
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const mpPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    
    if (!mpAccessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN not found")
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago Access Token not configured",
        step: "mp_config_check",
        orderId: createdOrder.id
      }, { status: 500 })
    }
    
    if (!mpPublicKey) {
      console.error("❌ MERCADOPAGO_PUBLIC_KEY not found")
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago Public Key not configured",
        step: "mp_config_check",
        orderId: createdOrder.id
      }, { status: 500 })
    }
    
    console.log("✅ MercadoPago environment variables found")
    console.log(`Access Token: ${mpAccessToken.substring(0, 10)}...`)
    console.log(`Public Key: ${mpPublicKey}`)
    
    // 4. Simular la creación de preferencia en MercadoPago (sin hacer la llamada real)
    console.log("4. Simulating MercadoPago preference creation...")
    
    const preferenceData = {
      items: mockFormData.orderData.items.map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "MXN"
      })),
      payer: {
        name: mockFormData.orderData.customer_data.firstName,
        surname: mockFormData.orderData.customer_data.lastName,
        email: mockFormData.orderData.customer_data.email,
        phone: {
          number: mockFormData.orderData.customer_data.phone
        },
        address: {
          street_name: mockFormData.orderData.customer_data.address.street_name,
          street_number: parseInt(mockFormData.orderData.customer_data.address.street_number),
          zip_code: mockFormData.orderData.customer_data.address.zip_code
        }
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.vercel.app'}/gracias-por-tu-compra?order_id=${createdOrder.id}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.vercel.app'}/error-pago?order_id=${createdOrder.id}`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.vercel.app'}/pago-pendiente?order_id=${createdOrder.id}`
      },
      auto_return: "approved",
      external_reference: createdOrder.id.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.vercel.app'}/api/mercadopago/webhook`,
      statement_descriptor: "PETGOURMET"
    }
    
    console.log("Preference data to send:", JSON.stringify(preferenceData, null, 2))
    
    // 5. Simular la actualización de la orden con el preference_id
    console.log("5. Simulating order update with preference_id...")
    const mockPreferenceId = `mock_pref_${debugId}`
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_intent_id: mockPreferenceId })
      .eq('id', createdOrder.id)
    
    if (updateError) {
      console.error("❌ Order update failed:", updateError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Order update with preference_id failed",
        details: updateError,
        step: "order_update",
        orderId: createdOrder.id
      }, { status: 500 })
    }
    
    console.log("✅ Order updated with mock preference_id")
    
    // 6. Verificar el estado final de la orden
    console.log("6. Verifying final order state...")
    const { data: finalOrder, error: verifyError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', createdOrder.id)
      .single()
    
    if (verifyError) {
      console.error("❌ Final verification failed:", verifyError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Final order verification failed",
        details: verifyError,
        step: "final_verification",
        orderId: createdOrder.id
      }, { status: 500 })
    }
    
    console.log("✅ Final order state verified")
    
    // 7. Limpiar orden de prueba
    console.log("7. Cleaning up test order...")
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', createdOrder.id)
    
    if (deleteError) {
      console.error("⚠️ Test order cleanup failed:", deleteError)
    } else {
      console.log("✅ Test order cleaned up successfully")
    }
    
    console.log(`=== MERCADOPAGO FLOW DEBUG COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "MercadoPago flow debug test completed successfully",
      results: {
        order_creation: "✅ Success",
        mp_config_check: "✅ Success",
        preference_simulation: "✅ Success",
        order_update: "✅ Success",
        final_verification: "✅ Success",
        cleanup: deleteError ? "⚠️ Warning" : "✅ Success"
      },
      environment_check: {
        node_env: process.env.NODE_ENV,
        base_url: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
        vercel_url: process.env.VERCEL_URL || 'Not set',
        mp_access_token: mpAccessToken ? "✅ Set" : "❌ Missing",
        mp_public_key: mpPublicKey ? "✅ Set" : "❌ Missing"
      },
      test_data: {
        created_order_id: createdOrder.id,
        order_number: orderNumber,
        mock_preference_id: mockPreferenceId,
        final_order_state: finalOrder,
        preference_data: preferenceData
      }
    })
    
  } catch (error) {
    console.error("❌ MERCADOPAGO FLOW DEBUG FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "MercadoPago flow debug test failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_url: process.env.VERCEL_URL
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "MercadoPago Flow Debug Test Endpoint",
    description: "Use POST method to run MercadoPago flow debugging tests",
    endpoints: {
      post: "/api/debug/mercadopago-flow",
      method: "POST",
      purpose: "Test complete MercadoPago order creation flow"
    },
    timestamp: new Date().toISOString()
  })
}
