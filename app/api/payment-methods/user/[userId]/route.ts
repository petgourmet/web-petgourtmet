// app/api/payment-methods/user/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PaymentMethod {
  id: string
  user_id: string
  card_brand: string
  card_last_four: string
  cardholder_name: string
  card_exp_month: number
  card_exp_year: number
  is_default: boolean
  is_active: boolean
  is_test: boolean
  created_at: string
}

// GET - Obtener métodos de pago de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    // Por ahora, simulamos métodos de pago basados en órdenes completadas
    // En el futuro, esto se conectará a una tabla real de métodos de pago
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("*")
      .or(`user_id.eq.${userId}`)
      .eq("payment_status", "completed")
      .limit(1)

    if (error) throw error

    // Si el usuario tiene órdenes completadas, simular que tiene un método de pago
    let simulatedPaymentMethods: PaymentMethod[] = []
    if (orderData && orderData.length > 0) {
      simulatedPaymentMethods = [{
        id: `pm_${userId}_default`,
        user_id: userId,
        card_brand: "visa",
        card_last_four: "4242",
        cardholder_name: "Usuario Ejemplo",
        card_exp_month: 12,
        card_exp_year: 2025,
        is_default: true,
        is_active: true,
        is_test: true,
        created_at: new Date().toISOString()
      }]
    }

    return NextResponse.json({
      success: true,
      payment_methods: simulatedPaymentMethods
    })

  } catch (error) {
    console.error('❌ Error obteniendo métodos de pago:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar método de pago (establecer como predeterminado)
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { paymentMethodId, action } = await request.json()
    
    // Simular actualización exitosa
    if (action === 'set_default') {
      return NextResponse.json({
        success: true,
        message: 'Método de pago actualizado como predeterminado'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Error actualizando método de pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar método de pago
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { paymentMethodId } = await request.json()
    
    // Simular eliminación exitosa
    return NextResponse.json({
      success: true,
      message: 'Método de pago eliminado'
    })

  } catch (error) {
    console.error('❌ Error eliminando método de pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
