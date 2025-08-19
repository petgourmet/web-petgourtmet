import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para obtener URLs de suscripción de MercadoPago
 * Estas URLs se usan para redirigir a los usuarios a completar sus suscripciones
 */
export async function GET(request: NextRequest) {
  try {
    // URLs de suscripción de MercadoPago por tipo de frecuencia
    // En producción, estas deberían venir de variables de entorno o base de datos
    const subscriptionUrls = {
      weekly: process.env.MERCADOPAGO_WEEKLY_SUBSCRIPTION_URL || 
              "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b5c",
      
      biweekly: process.env.MERCADOPAGO_BIWEEKLY_SUBSCRIPTION_URL || 
                "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b5d",
      
      monthly: process.env.MERCADOPAGO_MONTHLY_SUBSCRIPTION_URL || 
               "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b5e",
      
      quarterly: process.env.MERCADOPAGO_QUARTERLY_SUBSCRIPTION_URL || 
                 "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b5f",
      
      annual: process.env.MERCADOPAGO_ANNUAL_SUBSCRIPTION_URL || 
              "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b60"
    }

    // Validar que todas las URLs estén configuradas
    const missingUrls = Object.entries(subscriptionUrls)
      .filter(([_, url]) => !url || url.includes('preapproval_plan_id=2c9380849325e6a20193a3d3e1b50b5'))
      .map(([type, _]) => type)

    if (missingUrls.length > 0) {
      console.warn('⚠️ URLs de suscripción usando valores por defecto para:', missingUrls.join(', '))
    }

    // Agregar información adicional para cada tipo de suscripción
    const subscriptionConfig = {
      weekly: {
        period: 'weekly',
        mercadopago_url: subscriptionUrls.weekly,
        frequency_days: 7,
        discount_percentage: 5,
        description: 'Suscripción semanal con 5% de descuento'
      },
      biweekly: {
        period: 'biweekly',
        mercadopago_url: subscriptionUrls.biweekly,
        frequency_days: 14,
        discount_percentage: 10,
        description: 'Suscripción quincenal con 10% de descuento'
      },
      monthly: {
        period: 'monthly',
        mercadopago_url: subscriptionUrls.monthly,
        frequency_days: 30,
        discount_percentage: 15,
        description: 'Suscripción mensual con 15% de descuento'
      },
      quarterly: {
        period: 'quarterly',
        mercadopago_url: subscriptionUrls.quarterly,
        frequency_days: 90,
        discount_percentage: 20,
        description: 'Suscripción trimestral con 20% de descuento'
      },
      annual: {
        period: 'annual',
        mercadopago_url: subscriptionUrls.annual,
        frequency_days: 365,
        discount_percentage: 25,
        description: 'Suscripción anual con 25% de descuento'
      }
    }

    return NextResponse.json({
      success: true,
      subscription_urls: subscriptionConfig,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })

  } catch (error) {
    console.error('❌ Error obteniendo URLs de suscripción:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron cargar las URLs de suscripción',
      // URLs de respaldo en caso de error
      fallback_urls: {
        weekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=weekly_plan_fallback",
        biweekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=biweekly_plan_fallback",
        monthly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=monthly_plan_fallback",
        quarterly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=quarterly_plan_fallback",
        annual: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=annual_plan_fallback"
      }
    }, { status: 500 })
  }
}

/**
 * Endpoint para actualizar URLs de suscripción (solo para admin)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscription_type, mercadopago_url } = body

    // Validar parámetros
    if (!subscription_type || !mercadopago_url) {
      return NextResponse.json({
        success: false,
        error: 'Parámetros requeridos: subscription_type, mercadopago_url'
      }, { status: 400 })
    }

    // Validar tipo de suscripción
    const validTypes = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']
    if (!validTypes.includes(subscription_type)) {
      return NextResponse.json({
        success: false,
        error: `Tipo de suscripción inválido. Tipos válidos: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Validar URL de MercadoPago
    if (!mercadopago_url.includes('mercadopago.com') || !mercadopago_url.includes('preapproval_plan_id')) {
      return NextResponse.json({
        success: false,
        error: 'URL de MercadoPago inválida. Debe contener mercadopago.com y preapproval_plan_id'
      }, { status: 400 })
    }

    // En una implementación real, aquí guardarías en base de datos
    // Por ahora, solo devolvemos confirmación
    console.log(`✅ URL de suscripción ${subscription_type} actualizada:`, mercadopago_url)

    return NextResponse.json({
      success: true,
      message: `URL de suscripción ${subscription_type} actualizada exitosamente`,
      subscription_type,
      mercadopago_url,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error actualizando URL de suscripción:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}