import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action, data } = await request.json()
    const subscriptionId = params.id

    if (!subscriptionId) {
      return NextResponse.json({ error: "ID de suscripción requerido" }, { status: 400 })
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case "pause":
        updateData.status = "paused"
        break
      case "resume":
        updateData.status = "active"
        break
      case "cancel":
        updateData.status = "cancelled"
        updateData.cancel_at_period_end = true
        break
      case "update_frequency":
        if (data.frequency) {
          updateData.subscription_type = data.frequency
          // Recalcular próxima fecha de facturación
          const nextDate = calculateNextBillingDate(data.frequency)
          updateData.next_billing_date = nextDate.toISOString().split('T')[0]
        }
        break
      case "update_quantity":
        if (data.quantity) {
          updateData.quantity = data.quantity
          // Recalcular precio si es necesario
          if (data.basePrice) {
            updateData.base_price = data.basePrice * data.quantity
            updateData.discounted_price = updateData.base_price * (1 - (updateData.discount_percentage || 0) / 100)
          }
        }
        break
      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    const { data: updatedSubscription, error } = await supabaseAdmin
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)
      .select()
      .single()

    if (error) {
      console.error("Error updating subscription:", error)
      return NextResponse.json({ error: "Error al actualizar suscripción" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription,
      message: getSuccessMessage(action)
    })

  } catch (error) {
    console.error("Error in subscription update:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function calculateNextBillingDate(frequency: string, currentDate: Date = new Date()): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case "biweekly":
      nextDate.setDate(nextDate.getDate() + 14)
      break
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case "annual":
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      nextDate.setMonth(nextDate.getMonth() + 1)
  }

  return nextDate
}

function getSuccessMessage(action: string): string {
  switch (action) {
    case "pause":
      return "Suscripción pausada exitosamente"
    case "resume":
      return "Suscripción reanudada exitosamente"
    case "cancel":
      return "Suscripción cancelada exitosamente"
    case "update_frequency":
      return "Frecuencia de suscripción actualizada"
    case "update_quantity":
      return "Cantidad de suscripción actualizada"
    default:
      return "Suscripción actualizada exitosamente"
  }
}
