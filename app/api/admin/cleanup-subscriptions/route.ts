import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza y configuración de suscripciones...')

    const results = []
    let successCount = 0
    let errorCount = 0

    // 1. Primero obtener IDs de orders de prueba
    let testOrderIds: number[] = []
    try {
      console.log('🔍 Buscando orders de prueba...')
      const { data: testOrders, error: findOrdersError } = await supabaseAdmin
           .from('orders')
           .select('id')
           .eq('status', 'test')
      
      if (findOrdersError) {
        console.error('❌ Error buscando orders de prueba:', findOrdersError)
        errorCount++
        results.push({ step: 'find_test_orders', success: false, error: findOrdersError.message })
      } else {
        testOrderIds = testOrders?.map(order => order.id) || []
        console.log(`📋 Encontrados ${testOrderIds.length} orders de prueba`)
        successCount++
        results.push({ step: 'find_test_orders', success: true, count: testOrderIds.length })
      }
    } catch (err) {
      console.error('💥 Excepción buscando orders de prueba:', err)
      errorCount++
      results.push({ step: 'find_test_orders', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
    }

    // 2. Limpiar order_items de prueba
    if (testOrderIds.length > 0) {
      try {
        console.log('🗑️ Limpiando order_items de prueba...')
        const { error: deleteOrderItemsError } = await supabaseAdmin
          .from('order_items')
          .delete()
          .in('order_id', testOrderIds)
        
        if (deleteOrderItemsError) {
          console.error('❌ Error limpiando order_items:', deleteOrderItemsError)
          errorCount++
          results.push({ step: 'delete_order_items', success: false, error: deleteOrderItemsError.message })
        } else {
          console.log('✅ Order_items de prueba eliminados')
          successCount++
          results.push({ step: 'delete_order_items', success: true })
        }
      } catch (err) {
        console.error('💥 Excepción limpiando order_items:', err)
        errorCount++
        results.push({ step: 'delete_order_items', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
      }
    } else {
      console.log('ℹ️ No hay order_items de prueba para eliminar')
      results.push({ step: 'delete_order_items', success: true, note: 'No hay datos de prueba' })
    }

    // 3. Limpiar orders de prueba
    if (testOrderIds.length > 0) {
      try {
        console.log('🗑️ Limpiando orders de prueba...')
        const { error: deleteOrdersError } = await supabaseAdmin
          .from('orders')
          .delete()
          .in('id', testOrderIds)
        
        if (deleteOrdersError) {
          console.error('❌ Error limpiando orders:', deleteOrdersError)
          errorCount++
          results.push({ step: 'delete_orders', success: false, error: deleteOrdersError.message })
        } else {
          console.log('✅ Orders de prueba eliminados')
          successCount++
          results.push({ step: 'delete_orders', success: true })
        }
      } catch (err) {
        console.error('💥 Excepción limpiando orders:', err)
        errorCount++
        results.push({ step: 'delete_orders', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
      }
    } else {
      console.log('ℹ️ No hay orders de prueba para eliminar')
      results.push({ step: 'delete_orders', success: true, note: 'No hay datos de prueba' })
    }

    // 4. Limpiar pending_subscriptions de prueba
    try {
      console.log('🗑️ Limpiando pending_subscriptions de prueba...')
      const { error: deletePendingError } = await supabaseAdmin
        .from('pending_subscriptions')
        .delete()
        .or('external_reference.ilike.%test%,status.eq.test')
      
      if (deletePendingError) {
        console.error('❌ Error limpiando pending_subscriptions:', deletePendingError)
        errorCount++
        results.push({ step: 'delete_pending_subscriptions', success: false, error: deletePendingError.message })
      } else {
        console.log('✅ Pending_subscriptions de prueba eliminados')
        successCount++
        results.push({ step: 'delete_pending_subscriptions', success: true })
      }
    } catch (err) {
      console.error('💥 Excepción limpiando pending_subscriptions:', err)
      errorCount++
      results.push({ step: 'delete_pending_subscriptions', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
    }

    // 5. Verificar si user_subscriptions existe
    try {
      console.log('🔍 Verificando tabla user_subscriptions...')
      const { error: checkError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      if (checkError) {
        console.log('⚠️ Tabla user_subscriptions no existe, necesita ser creada manualmente')
        results.push({ 
          step: 'check_user_subscriptions', 
          success: false, 
          error: 'Tabla no existe - crear manualmente en Supabase',
          note: 'Usar SQL: CREATE TABLE user_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id), product_id INTEGER REFERENCES products(id), status VARCHAR(20) DEFAULT \'pending\', subscription_type VARCHAR(50), price NUMERIC(10,2), quantity INTEGER DEFAULT 1, size VARCHAR(50), next_billing_date TIMESTAMPTZ, last_billing_date TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), cancelled_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true, mercadopago_subscription_id TEXT, external_reference TEXT, discount_amount NUMERIC(10,2) DEFAULT 0, frequency INTEGER DEFAULT 1, frequency_type VARCHAR(20) DEFAULT \'months\');'
        })
        errorCount++
      } else {
        console.log('✅ Tabla user_subscriptions existe')
        successCount++
        results.push({ step: 'check_user_subscriptions', success: true })
        
        // Limpiar user_subscriptions de prueba
        try {
          const { error: deleteUserSubsError } = await supabaseAdmin
            .from('user_subscriptions')
            .delete()
            .or('external_reference.ilike.%test%,status.eq.test')
          
          if (deleteUserSubsError) {
            console.error('❌ Error limpiando user_subscriptions:', deleteUserSubsError)
            errorCount++
            results.push({ step: 'delete_user_subscriptions', success: false, error: deleteUserSubsError.message })
          } else {
            console.log('✅ User_subscriptions de prueba eliminados')
            successCount++
            results.push({ step: 'delete_user_subscriptions', success: true })
          }
        } catch (err) {
          console.error('💥 Excepción limpiando user_subscriptions:', err)
          errorCount++
          results.push({ step: 'delete_user_subscriptions', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
        }
      }
    } catch (err) {
      console.error('💥 Excepción verificando user_subscriptions:', err)
      errorCount++
      results.push({ step: 'check_user_subscriptions', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
    }

    // 6. Verificar subscription_payments
    try {
      console.log('🔍 Verificando tabla subscription_payments...')
      const { error: checkPaymentsError } = await supabaseAdmin
        .from('subscription_payments')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      if (checkPaymentsError) {
        console.log('⚠️ Tabla subscription_payments no existe, necesita ser creada manualmente')
        results.push({ 
          step: 'check_subscription_payments', 
          success: false, 
          error: 'Tabla no existe - crear manualmente en Supabase',
          note: 'Usar SQL: CREATE TABLE subscription_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id UUID REFERENCES user_subscriptions(id), billing_date TIMESTAMPTZ NOT NULL, amount NUMERIC(10,2) NOT NULL, status VARCHAR(20) DEFAULT \'pending\', payment_method VARCHAR(50), mercadopago_payment_id TEXT, collection_id TEXT, external_reference TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), processed_at TIMESTAMPTZ);'
        })
        errorCount++
      } else {
        console.log('✅ Tabla subscription_payments existe')
        successCount++
        results.push({ step: 'check_subscription_payments', success: true })
      }
    } catch (err) {
      console.error('💥 Excepción verificando subscription_payments:', err)
      errorCount++
      results.push({ step: 'check_subscription_payments', success: false, error: err instanceof Error ? err.message : 'Error desconocido' })
    }

    // 7. Verificar estado final de las tablas
    console.log('🔍 Verificando estado final de tablas...')
    
    const tableChecks = [
      'user_subscriptions',
      'subscription_payments', 
      'pending_subscriptions',
      'orders',
      'order_items'
    ]

    const tableStatus = []
    for (const tableName of tableChecks) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('id')
          .limit(1)

        tableStatus.push({
          table: tableName,
          exists: !error,
          recordCount: data?.length || 0,
          error: error?.message
        })
      } catch (err) {
        tableStatus.push({
          table: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Error desconocido'
        })
      }
    }

    console.log('📊 Resumen de limpieza y configuración:')
    console.log(`✅ Pasos exitosos: ${successCount}`)
    console.log(`❌ Pasos con error: ${errorCount}`)
    console.log('📋 Estado de tablas:', tableStatus)

    return NextResponse.json({
      success: errorCount === 0,
      message: `Limpieza completada. ${successCount} pasos exitosos, ${errorCount} errores.`,
      summary: {
        totalSteps: results.length,
        successCount,
        errorCount,
        tableStatus
      },
      details: results,
      instructions: {
        createUserSubscriptions: 'Si user_subscriptions no existe, crear en Supabase SQL Editor',
        createSubscriptionPayments: 'Si subscription_payments no existe, crear en Supabase SQL Editor',
        sqlFile: 'Ver archivo sql/cleanup-and-setup-subscriptions.sql para comandos completos'
      }
    })

  } catch (error: any) {
    console.error('💥 Error general en limpieza:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido',
        message: 'Error al ejecutar la limpieza de suscripciones'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint para limpieza de datos de suscripciones',
    usage: 'POST para ejecutar la limpieza',
    tables: [
      'user_subscriptions - Suscripciones activas de usuarios',
      'subscription_payments - Historial de pagos de suscripciones',
      'pending_subscriptions - Suscripciones pendientes de activación',
      'orders - Órdenes de compra',
      'order_items - Items de las órdenes'
    ]
  })
}