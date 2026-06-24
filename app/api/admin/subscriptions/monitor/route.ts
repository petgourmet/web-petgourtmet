// ============================================================
// API Route: GET /api/admin/subscriptions/monitor
//
// Endpoint específico para el dashboard de monitoreo
// (/admin/subscription-monitor). NO mezclar con
// /api/admin/subscriptions (que está enfocado en gestión
// transaccional y mantiene su contrato { success, data }).
//
// Devuelve los 3 datasets que el monitor consume en sus tabs:
//   - active   : suscripciones con status = 'active'
//   - pending  : suscripciones con status = 'pending'
//   - webhooks : últimos 30 eventos de webhook_logs
//
// Devuelve también `errors` por sección para que la UI pueda
// mostrar warnings granulares sin bloquear toda la pantalla
// (por ejemplo, si la tabla webhook_logs aún no existe).
//
// Usa service_role para bypass de RLS de forma segura.
// SELECT * a propósito — así no se rompe si faltan columnas
// que se agregan en migraciones futuras.
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") ?? "100")

    const supabase = createServiceClient()

    // ── Suscripciones activas ───────────────────────────────
    const activeQuery = supabase
      .from("unified_subscriptions")
      .select(
        `
        *,
        profiles:user_id (
          email,
          full_name
        )
      `
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit)

    // ── Suscripciones pendientes ────────────────────────────
    const pendingQuery = supabase
      .from("unified_subscriptions")
      .select(
        `
        *,
        profiles:user_id (
          email,
          full_name
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit)

    // ── Webhook logs recientes ──────────────────────────────
    // Si la tabla webhook_logs aún no existe, el error se
    // captura en `errors.webhooks` y la UI muestra un mensaje
    // amigable indicando que falta aplicar la migración.
    const webhookQuery = supabase
      .from("webhook_logs")
      .select("*")
      .in("source", ["stripe", "mercadopago"])
      .order("created_at", { ascending: false })
      .limit(30)

    const [activeResult, pendingResult, webhookResult] = await Promise.all([
      activeQuery,
      pendingQuery,
      webhookQuery,
    ])

    return NextResponse.json({
      active: activeResult.data ?? [],
      pending: pendingResult.data ?? [],
      webhooks: webhookResult.data ?? [],
      errors: {
        active: activeResult.error?.message ?? null,
        pending: pendingResult.error?.message ?? null,
        webhooks: webhookResult.error?.message ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[Admin Subscriptions Monitor API]", err)
    return NextResponse.json(
      {
        active: [],
        pending: [],
        webhooks: [],
        errors: {
          active: null,
          pending: null,
          webhooks: null,
          fatal: message,
        },
      },
      { status: 500 }
    )
  }
}
