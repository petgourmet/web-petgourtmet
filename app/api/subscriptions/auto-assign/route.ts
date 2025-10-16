import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import MercadoPagoService from '@/lib/mercadopago-service'
import { logger, LogCategory } from '@/lib/logger'

// Configuración de MercadoPago (solo lectura de preapprovals)
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ''

// Tipos mínimos esperados en unified_subscriptions
type UnifiedSubscription = {
  id: string | number
  user_id: string | null
  mercadopago_subscription_id: string | null
  customer_data?: any
  status?: string
  created_at?: string
}

// ---------------------- Utilidades ----------------------
function normalizeEmail(email: string | null | undefined) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null
}

function safeParseJSON(data: any) {
  if (!data) return null
  if (typeof data === 'object') return data
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

// Extraer email del customer_data si existe
function extractEmailFromCustomerData(customer_data: any): string | null {
  const obj = safeParseJSON(customer_data)
  if (!obj) return null
  // Paths comunes
  const candidates = [
    obj.email,
    obj.customer_data?.email,
    obj.customer?.email,
    obj.payer_email,
    obj.payer?.email,
    obj.contact?.email,
  ]
  for (const c of candidates) {
    const e = normalizeEmail(c)
    if (e) return e
  }
  return null
}

// Buscar email en detalles de pago (subscription_billing_history.payment_details)
function extractEmailFromPaymentDetails(details: any): string | null {
  const d = safeParseJSON(details) || {}
  const candidates = [
    d.payer_email,
    d.payer?.email,
    d.additional_info?.payer?.email,
    d.card?.cardholder?.email,
    d.order?.payer?.email,
  ]
  for (const c of candidates) {
    const e = normalizeEmail(c)
    if (e) return e
  }
  return null
}

// Buscar usuario por email en profiles o auth.users
async function findUserByEmail(email: string) {
  const supabase = createServiceClient()

  try {
    // 1) Buscar en profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (!profileError && profiles && profiles.length > 0) {
      return profiles[0]
    }

    // 2) Buscar en auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      logger.error(LogCategory.USER, 'Error searching user in auth.users', { email, error: usersError })
      return null
    }

    const user = users.find(u => normalizeEmail(u.email) === email)
    return user || null
  } catch (error) {
    logger.error(LogCategory.USER, 'Error in findUserByEmail', { email, error })
    return null
  }
}

// Actualizar user_id en unified_subscriptions
async function updateSubscriptionUserId(subscriptionId: number | string, userId: string) {
  const supabase = createServiceClient()
  try {
    const { error } = await supabase
      .from('unified_subscriptions')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    if (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error updating subscription user_id', { subscriptionId, error })
      return false
    }
    return true
  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error updating user_id for subscription', { subscriptionId, error })
    return false
  }
}

// Obtener payer_email desde MercadoPago (preapproval)
async function getEmailFromMercadoPago(preapprovalId: string): Promise<string | null> {
  if (!MERCADOPAGO_ACCESS_TOKEN || !preapprovalId) return null
  try {
    const mp = new MercadoPagoService(MERCADOPAGO_ACCESS_TOKEN)
    const preapproval = await mp.getSubscription(preapprovalId)
    const candidates = [preapproval?.payer_email, preapproval?.payer?.email]
    for (const c of candidates) {
      const e = normalizeEmail(c)
      if (e) return e
    }
    return null
  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error getting payer_email from MercadoPago', { preapprovalId, error })
    return null
  }
}

// Intentar derivar el email para una suscripción concreta
async function resolveEmailForSubscription(subscription: UnifiedSubscription): Promise<string | null> {
  // 1) customer_data
  const fromCustomer = extractEmailFromCustomerData(subscription.customer_data)
  if (fromCustomer) return fromCustomer

  const supabase = createServiceClient()

  // 2) subscription_billing_history (último registro)
  try {
    const { data: history, error } = await supabase
      .from('subscription_billing_history')
      .select('id, payer_email, payment_details')
      .eq('unified_subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && history && history.length > 0) {
      const row = history[0] as any
      const candidates = [normalizeEmail(row.payer_email), extractEmailFromPaymentDetails(row.payment_details)]
      for (const c of candidates) {
        if (c) return c
      }
    }
  } catch (e) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error querying subscription_billing_history', { subscriptionId: subscription.id, error: e })
  }

  // 3) MercadoPago (preapproval)
  if (subscription.mercadopago_subscription_id) {
    const mpEmail = await getEmailFromMercadoPago(subscription.mercadopago_subscription_id)
    if (mpEmail) return mpEmail
  }

  return null
}

// Procesar suscripción individual
async function processSubscription(subscriptionId: number | string) {
  const supabase = createServiceClient()

  // Recuperar suscripción sin user_id
  const { data: subscription, error: fetchError } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .is('user_id', null)
    .single()

  if (fetchError || !subscription) {
    return { success: false, message: 'Suscripción no encontrada o ya tiene user_id asignado' }
  }

  const email = await resolveEmailForSubscription(subscription)
  if (!email) {
    return { success: false, message: 'No se pudo determinar el email del suscriptor' }
  }

  const user = await findUserByEmail(email)
  if (!user) {
    return { success: false, message: `Usuario no encontrado para email ${email}` }
  }

  const ok = await updateSubscriptionUserId(subscription.id, user.id)
  if (!ok) {
    return { success: false, message: 'Error actualizando la suscripción' }
  }

  return {
    success: true,
    message: `Suscripción ${subscription.id} asociada a usuario ${user.id}`,
    data: { subscriptionId: subscription.id, userId: user.id, email }
  }
}

// Procesar lote de suscripciones sin user_id
async function processAllSubscriptions(limit = 50) {
  const supabase = createServiceClient()

  const { data: subs, error } = await supabase
    .from('unified_subscriptions')
    .select('id, user_id, mercadopago_subscription_id, customer_data, status, created_at')
    .is('user_id', null)
    .in('status', ['active', 'pending', 'paused'])
    .limit(limit)

  if (error) {
    return { success: false, message: `Error obteniendo suscripciones: ${error.message}` }
  }

  if (!subs || subs.length === 0) {
    return { success: true, message: 'No hay suscripciones que necesiten procesamiento', data: { processed: 0, successful: 0, failed: 0, details: [] } }
  }

  const results = { processed: 0, successful: 0, failed: 0, details: [] as any[] }

  for (const sub of subs as UnifiedSubscription[]) {
    results.processed++
    const res = await processSubscription(sub.id)
    if (res.success) results.successful++
    else results.failed++
    results.details.push({ subscriptionId: sub.id, success: res.success, message: res.message })
  }

  return { success: true, message: `Procesamiento completado: ${results.successful}/${results.processed} suscripciones asociadas`, data: results }
}

// ---------------------- Rutas ----------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { subscriptionId, processAll } = body

    logger.info(LogCategory.SUBSCRIPTION, 'Auto-assign subscriptions API called', { subscriptionId, processAll })

    if (subscriptionId) {
      const result = await processSubscription(subscriptionId)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } else if (processAll) {
      const result = await processAllSubscriptions(50)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } else {
      return NextResponse.json({ success: false, message: 'Debe especificar subscriptionId o processAll=true' }, { status: 400 })
    }
  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error in auto-assign subscriptions API', { error })
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET: Estadísticas y muestra de suscripciones sin user_id
export async function GET() {
  try {
    const supabase = createServiceClient()

    const { count, error: countError } = await supabase
      .from('unified_subscriptions')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
      .in('status', ['active', 'pending', 'paused'])

    if (countError) {
      return NextResponse.json({ success: false, message: `Error obteniendo estadísticas: ${countError.message}` }, { status: 500 })
    }

    const { data: sample, error: sampleError } = await supabase
      .from('unified_subscriptions')
      .select('id, mercadopago_subscription_id, customer_data, status, created_at')
      .is('user_id', null)
      .in('status', ['active', 'pending', 'paused'])
      .order('created_at', { ascending: false })
      .limit(5)

    const withEmails = [] as any[]
    for (const s of sample || []) {
      const email = await resolveEmailForSubscription(s)
      withEmails.push({ ...s, candidate_email: email })
    }

    return NextResponse.json({ success: true, data: { subscriptionsWithoutUserId: count || 0, sample: withEmails } })
  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error in GET auto-assign subscriptions API', { error })
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
  }
}