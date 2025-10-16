import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger, LogCategory } from '@/lib/logger'

/**
 * API endpoint para crear órdenes de prueba que coincidan con webhooks de MercadoPago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      external_reference, 
      total = 1000, 
      customer_name = "Cliente de Prueba",
      customer_email = "test@petgourmet.com",
      customer_phone = "5555555555"
    } = body

    // Validar external_reference requerido
    if (!external_reference) {
      return NextResponse.json(
        { error: 'external_reference es requerido' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verificar si ya existe una orden con este external_reference
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, external_reference')
      .eq('external_reference', external_reference)
      .single()

    if (existingOrder) {
      logger.warn(LogCategory.ORDER, 'Intento de crear orden duplicada', {
        external_reference,
        existing_order_id: existingOrder.id
      })
      return NextResponse.json(
        { 
          error: 'Ya existe una orden con este external_reference',
          existing_order_id: existingOrder.id
        },
        { status: 409 }
      )
    }

    // Crear datos de la orden de prueba
    const orderData = {
      status: 'pending',
      payment_status: 'pending',
      total: total,
      subtotal: total,
      shipping_cost: 0,
      customer_name,
      customer_email,
      customer_phone,
      external_reference,
      is_subscription: false,
      shipping_address: JSON.stringify({
        order_number: `TEST-${Date.now()}`,
        customer_name,
        customer_email,
        customer_phone,
        address: "Dirección de prueba 123",
        city: "Ciudad de México",
        state: "CDMX",
        postal_code: "12345",
        country: "México",
        items: [
          {
            id: 1,
            name: "Producto de Prueba",
            description: "Producto para testing del webhook",
            quantity: 1,
            price: total,
            unit_price: total
          }
        ],
        subtotal: total,
        shipping_cost: 0,
        taxes: 0,
        total: total,
        frequency: "none",
        created_at: new Date().toISOString()
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logger.info(LogCategory.ORDER, 'Creando orden de prueba', {
      external_reference,
      total,
      customer_email
    })

    // Insertar la orden en la base de datos
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (insertError) {
      logger.error(LogCategory.ORDER, 'Error creando orden de prueba', insertError, {
        external_reference,
        details: insertError
      })
      return NextResponse.json(
        { 
          error: 'Error creando orden de prueba',
          details: insertError.message
        },
        { status: 500 }
      )
    }

    logger.info(LogCategory.ORDER, 'Orden de prueba creada exitosamente', {
      order_id: newOrder.id,
      external_reference: newOrder.external_reference,
      total: newOrder.total
    })

    return NextResponse.json({
      success: true,
      message: 'Orden de prueba creada exitosamente',
      order: {
        id: newOrder.id,
        external_reference: newOrder.external_reference,
        status: newOrder.status,
        payment_status: newOrder.payment_status,
        total: newOrder.total,
        customer_name: newOrder.customer_name,
        customer_email: newOrder.customer_email,
        created_at: newOrder.created_at
      }
    })

  } catch (error) {
    logger.error(LogCategory.ORDER, 'Error en endpoint de creación de orden de prueba', error, {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint para obtener información sobre órdenes de prueba existentes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const external_reference = searchParams.get('external_reference')

    const supabase = createServiceClient()

    if (external_reference) {
      // Buscar orden específica por external_reference
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, external_reference, status, payment_status, total, customer_name, customer_email, created_at')
        .eq('external_reference', external_reference)
        .single()

      if (error || !order) {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        )
      }

      return NextResponse.json({ order })
    } else {
      // Listar órdenes de prueba recientes (últimas 10)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, external_reference, status, payment_status, total, customer_name, customer_email, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        return NextResponse.json(
          { error: 'Error obteniendo órdenes' },
          { status: 500 }
        )
      }

      return NextResponse.json({ orders })
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}