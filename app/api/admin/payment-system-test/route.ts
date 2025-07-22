import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"

export async function GET(request: NextRequest) {
  try {
    console.log('=== PAYMENT SYSTEM DIAGNOSTIC ===')
    
    const supabase = createServiceClient()
    
    // 1. Verificar configuración de MercadoPago
    const mpConfig = {
      accessToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      webhookSecret: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
      publicKey: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    }
    
    // 2. Obtener estadísticas de órdenes
    const { data: orderStats, error: statsError } = await supabase
      .from('orders')
      .select('status, payment_status, created_at')
    
    if (statsError) {
      return NextResponse.json({ error: 'Error fetching order stats' }, { status: 500 })
    }
    
    // Agrupar estadísticas
    const stats = {
      total: orderStats?.length || 0,
      byStatus: {} as Record<string, number>,
      byPaymentStatus: {} as Record<string, number>,
      pendingOlderThan3Days: 0
    }
    
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    orderStats?.forEach(order => {
      // Por estado
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1
      
      // Por estado de pago
      stats.byPaymentStatus[order.payment_status] = (stats.byPaymentStatus[order.payment_status] || 0) + 1
      
      // Pendientes de más de 3 días
      if (order.status === 'pending' && 
          order.payment_status === 'pending' && 
          new Date(order.created_at) < threeDaysAgo) {
        stats.pendingOlderThan3Days++
      }
    })
    
    // 3. Verificar órdenes específicas de Cristofer para testing
    const { data: cristoferOrders, error: cristoferError } = await supabase
      .from('orders')
      .select('*')
      .ilike('customer_email', '%cristofer%')
      .order('created_at', { ascending: false })
      .limit(5)
    
    // 4. Verificar configuración SMTP para emails
    const emailConfig = {
      smtpHost: !!process.env.SMTP_HOST,
      smtpUser: !!process.env.SMTP_USER,
      smtpPass: !!process.env.SMTP_PASS,
      emailFrom: !!process.env.EMAIL_FROM
    }
    
    return NextResponse.json({
      diagnostic: {
        timestamp: new Date().toISOString(),
        mercadopagoConfig: mpConfig,
        emailConfig,
        orderStatistics: stats,
        cristoferTestOrders: cristoferOrders || [],
        recommendations: [
          stats.pendingOlderThan3Days > 0 ? `⚠️  ${stats.pendingOlderThan3Days} órdenes pendientes necesitan ser canceladas` : '✅ No hay órdenes pendientes expiradas',
          mpConfig.accessToken ? '✅ MercadoPago Access Token configurado' : '❌ MercadoPago Access Token faltante',
          mpConfig.webhookSecret ? '✅ Webhook Secret configurado' : '⚠️  Webhook Secret no configurado (opcional)',
          emailConfig.smtpHost ? '✅ SMTP configurado para emails' : '❌ SMTP no configurado'
        ]
      }
    })
    
  } catch (error) {
    console.error('Error in payment system diagnostic:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action
    
    const supabase = createServiceClient()

    // Validación completa del flujo de pagos
    if (action === 'validate_flow') {
      console.log('=== VALIDACIÓN COMPLETA DEL FLUJO DE PAGOS ===')
      
      const flowValidation = {
        timestamp: new Date().toISOString(),
        steps: [] as any[],
        success: true,
        errors: [] as string[],
        summary: '',
        testOrderId: null as number | null
      }

      try {
        // PASO 1: Verificar configuración básica
        flowValidation.steps.push({
          step: 1,
          name: 'Verificar Configuración Básica',
          status: 'running',
          details: 'Validando variables de entorno...'
        })

        const requiredEnvVars = {
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
          MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
          NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
        }

        const missingVars = Object.entries(requiredEnvVars)
          .filter(([key, value]) => !value)
          .map(([key]) => key)

        if (missingVars.length > 0) {
          flowValidation.steps[0].status = 'error'
          flowValidation.steps[0].error = `Variables faltantes: ${missingVars.join(', ')}`
          flowValidation.success = false
          flowValidation.errors.push('Configuración básica incompleta')
        } else {
          flowValidation.steps[0].status = 'success'
          flowValidation.steps[0].details = 'Todas las variables de entorno configuradas'
        }

        // PASO 2: Crear orden de prueba
        flowValidation.steps.push({
          step: 2,
          name: 'Crear Orden de Prueba',
          status: 'running',
          details: 'Creando orden de prueba en la base de datos...'
        })

        const testOrderData = {
          status: 'pending',
          payment_status: 'pending',
          total: 99.99,
          user_id: null,
          customer_name: 'Test Flow Validation',
          customer_phone: '5551234567',
          shipping_address: JSON.stringify({
            order_number: `FLOW_TEST_${Date.now()}`,
            customer_data: {
              firstName: 'Test',
              lastName: 'Validation',
              email: 'test@validation.com',
              phone: '5551234567',
              address: { street_name: 'Test St', street_number: '123', zip_code: '12345' }
            },
            items: [{
              id: 'test-product',
              title: 'Producto de Prueba',
              quantity: 1,
              unit_price: 99.99
            }]
          })
        }

        const { data: createdOrder, error: orderError } = await supabase
          .from('orders')
          .insert(testOrderData)
          .select()
          .single()

        if (orderError) {
          flowValidation.steps[1].status = 'error'
          flowValidation.steps[1].error = `Error creando orden: ${orderError.message}`
          flowValidation.success = false
          flowValidation.errors.push('Error en creación de orden')
        } else {
          flowValidation.steps[1].status = 'success'
          flowValidation.steps[1].details = `Orden creada con ID: ${createdOrder.id}`
          flowValidation.testOrderId = createdOrder.id
        }

        // PASO 3: Validar creación de preferencia en MercadoPago (sin crear realmente)
        flowValidation.steps.push({
          step: 3,
          name: 'Validar Estructura de Preferencia',
          status: 'running',
          details: 'Validando formato de preferencia para MercadoPago...'
        })

        if (flowValidation.testOrderId) {
          const preferenceStructure = {
            items: [
              {
                id: 'test-product',
                title: 'Producto de Prueba',
                quantity: 1,
                unit_price: 99.99,
                currency_id: 'MXN'
              }
            ],
            payer: {
              name: 'Test',
              surname: 'Validation',
              email: 'test@validation.com'
            },
            back_urls: {
              success: `${process.env.NEXT_PUBLIC_BASE_URL}/gracias-por-tu-compra`,
              failure: `${process.env.NEXT_PUBLIC_BASE_URL}/error-pago`,
              pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pago-pendiente`
            },
            notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
            external_reference: flowValidation.testOrderId.toString()
          }

          flowValidation.steps[2].status = 'success'
          flowValidation.steps[2].details = 'Estructura de preferencia válida'
          flowValidation.steps[2].preferencePreview = preferenceStructure
        }

        // PASO 4: Simular webhook de pago aprobado
        flowValidation.steps.push({
          step: 4,
          name: 'Simular Webhook de Pago',
          status: 'running',
          details: 'Simulando recepción de webhook de pago aprobado...'
        })

        if (flowValidation.testOrderId) {
          // Simular actualización de estado por webhook
          const webhookSimulation = {
            payment_status: 'paid',
            status: 'processing',
            mercadopago_payment_id: `test_payment_${Date.now()}`,
            payment_method: 'credit_card',
            confirmed_at: new Date().toISOString()
          }

          const { error: webhookError } = await supabase
            .from('orders')
            .update(webhookSimulation)
            .eq('id', flowValidation.testOrderId)

          if (webhookError) {
            flowValidation.steps[3].status = 'error'
            flowValidation.steps[3].error = `Error simulando webhook: ${webhookError.message}`
            flowValidation.success = false
            flowValidation.errors.push('Error en simulación de webhook')
          } else {
            flowValidation.steps[3].status = 'success'
            flowValidation.steps[3].details = 'Webhook simulado correctamente - Estado actualizado a processing/paid'
          }
        }

        // PASO 5: Verificar envío de email
        flowValidation.steps.push({
          step: 5,
          name: 'Verificar Sistema de Emails',
          status: 'running',
          details: 'Validando configuración de emails...'
        })

        const emailConfig = {
          smtpHost: !!process.env.SMTP_HOST,
          smtpUser: !!process.env.SMTP_USER,
          smtpPass: !!process.env.SMTP_PASS,
          emailFrom: !!process.env.EMAIL_FROM
        }

        const emailConfigured = Object.values(emailConfig).every(val => val)

        if (emailConfigured) {
          flowValidation.steps[4].status = 'success'
          flowValidation.steps[4].details = 'Sistema de emails completamente configurado'
        } else {
          flowValidation.steps[4].status = 'warning'
          flowValidation.steps[4].details = 'Sistema de emails parcialmente configurado'
          flowValidation.steps[4].config = emailConfig
        }

        // PASO 6: Limpiar orden de prueba
        flowValidation.steps.push({
          step: 6,
          name: 'Limpieza',
          status: 'running',
          details: 'Eliminando orden de prueba...'
        })

        if (flowValidation.testOrderId) {
          const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', flowValidation.testOrderId)

          if (deleteError) {
            flowValidation.steps[5].status = 'warning'
            flowValidation.steps[5].details = `Orden de prueba no eliminada (ID: ${flowValidation.testOrderId})`
          } else {
            flowValidation.steps[5].status = 'success'
            flowValidation.steps[5].details = 'Orden de prueba eliminada correctamente'
          }
        }

        // Generar resumen
        const successSteps = flowValidation.steps.filter(s => s.status === 'success').length
        const errorSteps = flowValidation.steps.filter(s => s.status === 'error').length
        const warningSteps = flowValidation.steps.filter(s => s.status === 'warning').length

        flowValidation.summary = `Validación completada: ${successSteps} exitosos, ${errorSteps} errores, ${warningSteps} advertencias`

        if (errorSteps === 0) {
          flowValidation.summary += ' - ✅ FLUJO FUNCIONAL'
        } else {
          flowValidation.summary += ' - ❌ FLUJO CON ERRORES'
        }

      } catch (error) {
        flowValidation.success = false
        flowValidation.errors.push(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        flowValidation.summary = 'Validación falló con error crítico'
      }

      return NextResponse.json(flowValidation)
    }

    // Validación específica para producción con https://petgourmet.mx/
    if (action === 'validate_production') {
      const productionChecks = {
        urlAutorizada: {
          configured: process.env.NEXT_PUBLIC_BASE_URL === 'https://petgourmet.mx',
          current: process.env.NEXT_PUBLIC_BASE_URL,
          required: 'https://petgourmet.mx'
        },
        mercadopagoProduction: {
          accessTokenFormat: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-') || false,
          publicKeyFormat: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith('APP_USR-') || false,
          environment: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT,
          accessTokenPresent: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
          publicKeyPresent: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
        },
        webhookConfiguration: {
          webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
          secretConfigured: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
          httpsRequired: process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://') || false
        },
        emailSystem: {
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
          emailFrom: process.env.EMAIL_FROM
        }
      }

      const validationResults = {
        readyForProduction: 
          productionChecks.urlAutorizada.configured &&
          productionChecks.mercadopagoProduction.accessTokenFormat &&
          productionChecks.mercadopagoProduction.publicKeyFormat &&
          productionChecks.webhookConfiguration.httpsRequired &&
          productionChecks.mercadopagoProduction.accessTokenPresent &&
          productionChecks.mercadopagoProduction.publicKeyPresent,
        checks: productionChecks,
        warnings: [] as string[],
        errors: [] as string[],
        recommendations: [] as string[]
      }

      // Agregar errores críticos
      if (!productionChecks.urlAutorizada.configured) {
        validationResults.errors.push('❌ URL base debe ser https://petgourmet.mx para pagos en producción')
      }
      if (!productionChecks.mercadopagoProduction.accessTokenPresent) {
        validationResults.errors.push('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
      }
      if (!productionChecks.mercadopagoProduction.publicKeyPresent) {
        validationResults.errors.push('❌ NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY no configurado')
      }
      if (!productionChecks.mercadopagoProduction.accessTokenFormat) {
        validationResults.errors.push('❌ Access Token debe ser de producción (debe empezar con APP_USR-)')
      }
      if (!productionChecks.mercadopagoProduction.publicKeyFormat) {
        validationResults.errors.push('❌ Public Key debe ser de producción (debe empezar con APP_USR-)')
      }
      if (!productionChecks.webhookConfiguration.httpsRequired) {
        validationResults.errors.push('❌ Webhook requiere HTTPS para producción')
      }

      // Agregar warnings
      if (!productionChecks.webhookConfiguration.secretConfigured) {
        validationResults.warnings.push('⚠️ Webhook Secret no configurado (recomendado para seguridad)')
      }
      if (!productionChecks.emailSystem.smtpConfigured) {
        validationResults.warnings.push('⚠️ Sistema de emails no configurado completamente')
      }

      // Agregar recomendaciones
      if (validationResults.readyForProduction) {
        validationResults.recommendations.push('✅ Sistema listo para pagos en producción')
        validationResults.recommendations.push('✅ Webhook URL configurada: ' + productionChecks.webhookConfiguration.webhookUrl)
        validationResults.recommendations.push('✅ URL autorizada por MercadoPago: ' + productionChecks.urlAutorizada.current)
      } else {
        validationResults.recommendations.push('🔧 Corrige los errores antes de procesar pagos reales')
        validationResults.recommendations.push('📋 Configura el webhook en MercadoPago con la URL del sistema')
      }

      return NextResponse.json(validationResults)
    }
    
    if (action === 'test_webhook') {
      // Simular un webhook de MercadoPago
      const orderId = body.orderId
      const paymentStatus = body.paymentStatus || 'approved'
      
      if (!orderId) {
        return NextResponse.json({ error: 'orderId requerido para test' }, { status: 400 })
      }
      
      // Obtener la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError || !order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
      }
      
      // Simular actualización de estado basado en el pago
      let newOrderStatus = 'pending'
      let newPaymentStatus = paymentStatus
      
      if (paymentStatus === 'approved') {
        newOrderStatus = 'processing'
        newPaymentStatus = 'paid'
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        newOrderStatus = 'cancelled'
        newPaymentStatus = 'failed'
      }
      
      // Actualizar la orden
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newOrderStatus,
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString(),
          confirmed_at: paymentStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', orderId)
      
      if (updateError) {
        return NextResponse.json({ error: 'Error actualizando orden' }, { status: 500 })
      }
      
      // Enviar email de confirmación si el pago fue aprobado
      let emailSent = false
      if (paymentStatus === 'approved') {
        try {
          let customerData = null
          let orderNumber = null
          
          if (order.shipping_address) {
            try {
              const shippingData = typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address
              
              customerData = shippingData.customer_data
              orderNumber = shippingData.order_number
            } catch (e) {
              console.error('Error parsing shipping_address:', e)
            }
          }
          
          if (customerData?.email) {
            const customerName = customerData.firstName && customerData.lastName 
              ? `${customerData.firstName} ${customerData.lastName}`
              : customerData.firstName || customerData.email
            
            const finalOrderNumber = orderNumber || `PG-${order.id}`
            
            await sendOrderStatusEmail(
              'processing',
              customerData.email,
              finalOrderNumber,
              customerName
            )
            
            emailSent = true
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Webhook simulado exitosamente',
        orderUpdated: {
          id: orderId,
          oldStatus: order.status,
          newStatus: newOrderStatus,
          oldPaymentStatus: order.payment_status,
          newPaymentStatus: newPaymentStatus
        },
        emailSent
      })
      
    } else if (action === 'auto_cancel_test') {
      // Probar la cancelación automática
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      const { data: expiredOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, created_at, customer_email, customer_name')
        .eq('status', 'pending')
        .eq('payment_status', 'pending')
        .lt('created_at', threeDaysAgo.toISOString())
        .limit(5)
      
      if (fetchError) {
        return NextResponse.json({ error: 'Error buscando órdenes expiradas' }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Preview de órdenes a cancelar',
        expiredOrders: expiredOrders || [],
        cutoffDate: threeDaysAgo.toISOString(),
        note: 'Estas órdenes serían canceladas automáticamente'
      })
      
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in payment system test:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
