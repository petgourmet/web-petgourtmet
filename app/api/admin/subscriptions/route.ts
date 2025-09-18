import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Usar cliente de servicio que bypassa RLS completamente
    const serviceClient = createServiceClient()
    
    // Consulta optimizada para obtener todas las suscripciones
    const [userSubscriptionsResult, pendingSubscriptionsResult, billingHistoryResult] = await Promise.all([
      // Todas las suscripciones (activas, canceladas, etc.) - SIN FILTRO DE USUARIO
      serviceClient
        .from('unified_subscriptions')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            weekly_discount,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .order('created_at', { ascending: false }),
      
      // Suscripciones pendientes - SIN FILTRO DE USUARIO
      serviceClient
        .from('unified_subscriptions')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            weekly_discount,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .order('created_at', { ascending: false }),
      
      // Historial de facturación - SIN FILTRO DE USUARIO
      serviceClient
        .from('billing_history')
        .select(`
          *,
          unified_subscriptions (
            *,
            products (
              id,
              name,
              image,
              price,
              weekly_discount,
              monthly_discount,
              quarterly_discount,
              annual_discount,
              biweekly_discount
            )
          )
        `)
        .eq('status', 'approved')
        .order('billing_date', { ascending: false })
    ])
    
    if (userSubscriptionsResult.error) {
      console.error('Error fetching user subscriptions (admin):', userSubscriptionsResult.error)
    }
    if (pendingSubscriptionsResult.error) {
      console.error('Error fetching pending subscriptions (admin):', pendingSubscriptionsResult.error)
    }
    if (billingHistoryResult.error) {
      console.error('Error fetching billing history (admin):', billingHistoryResult.error)
    }
    
    const userSubscriptions = userSubscriptionsResult.data || []
    const pendingSubscriptions = pendingSubscriptionsResult.data || []
    const billingHistory = billingHistoryResult.data || []
    
    console.log(`📊 Admin data loaded: ${userSubscriptions.length} user subs, ${pendingSubscriptions.length} pending, ${billingHistory.length} billing records`)
    
    // Función auxiliar para obtener frecuencia
    function getFrequencyFromType(subscriptionType: string): string {
      switch (subscriptionType) {
        case 'weekly': return 'weekly'
        case 'biweekly': return 'biweekly'
        case 'monthly': return 'monthly'
        case 'quarterly': return 'quarterly'
        case 'annual': return 'annual'
        default: return 'monthly'
      }
    }
    
    // Procesar suscripciones activas
    const processedActiveSubscriptions = userSubscriptions.map(subscription => {
      const product = subscription.products
      const frequency = getFrequencyFromType(subscription.subscription_type)
      
      // Descuento esperado (desde producto en BD)
      let expectedDiscount = 0
      if (product) {
        switch (frequency) {
          case 'weekly':
            expectedDiscount = product.weekly_discount || 0
            break
          case 'monthly':
            expectedDiscount = product.monthly_discount || 0
            break
          case 'quarterly':
            expectedDiscount = product.quarterly_discount || 0
            break
          case 'annual':
            expectedDiscount = product.annual_discount || 0
            break
          case 'biweekly':
            expectedDiscount = product.biweekly_discount || 0
            break
        }
      }
    
      // Descuento aplicado (si existe en el registro de suscripción), de lo contrario usar esperado
      const appliedDiscount = (typeof subscription.discount_percentage === 'number' && !Number.isNaN(subscription.discount_percentage))
        ? subscription.discount_percentage
        : expectedDiscount
    
      const basePrice = (product?.price ?? subscription.price ?? 0) as number
      const discountedPrice = Number((basePrice * (1 - (appliedDiscount || 0) / 100)).toFixed(2))
      
      return {
        ...subscription,
        frequency,
        discount_amount: appliedDiscount,
        discount_percentage: appliedDiscount,
        base_price: basePrice,
        discounted_price: discountedPrice,
        expected_discount_percentage: expectedDiscount,
        applied_discount_percentage: appliedDiscount,
        discount_valid: appliedDiscount === expectedDiscount,
        source: 'subscriptions',
        products: product
      }
    })
    
    // Procesar suscripciones pendientes
    const processedPendingSubscriptions = pendingSubscriptions.map(subscription => {
      const product = subscription.products
      const frequency = getFrequencyFromType(subscription.subscription_type)
      
      // Descuento esperado (desde producto en BD)
      let expectedDiscount = 0
      if (product) {
        switch (frequency) {
          case 'weekly':
            expectedDiscount = product.weekly_discount || 0
            break
          case 'monthly':
            expectedDiscount = product.monthly_discount || 0
            break
          case 'quarterly':
            expectedDiscount = product.quarterly_discount || 0
            break
          case 'annual':
            expectedDiscount = product.annual_discount || 0
            break
          case 'biweekly':
            expectedDiscount = product.biweekly_discount || 0
            break
        }
      }
    
      const appliedDiscount = (typeof subscription.discount_percentage === 'number' && !Number.isNaN(subscription.discount_percentage))
        ? subscription.discount_percentage
        : expectedDiscount
    
      const basePrice = (product?.price ?? subscription.price ?? 0) as number
      const discountedPrice = Number((basePrice * (1 - (appliedDiscount || 0) / 100)).toFixed(2))
      
      return {
        id: `pending_${subscription.id}`,
        user_id: subscription.user_id,
        product_id: subscription.product_id,
        status: 'pending',
        frequency,
        price: subscription.price || 0,
        discount_amount: appliedDiscount,
        discount_percentage: appliedDiscount,
        base_price: basePrice,
        discounted_price: discountedPrice,
        expected_discount_percentage: expectedDiscount,
        applied_discount_percentage: appliedDiscount,
        discount_valid: appliedDiscount === expectedDiscount,
        next_billing_date: null,
        created_at: subscription.created_at,
        source: 'subscriptions',
        products: product
      }
    })
    
    // Procesar suscripciones del historial de facturación
    const processedBillingSubscriptions = billingHistory
      .filter(billing => {
        // Solo incluir si no existe ya en subscriptions
        const existsInActive = userSubscriptions.some(sub => 
          sub.id === billing.unified_subscriptions?.id ||
          sub.mercadopago_subscription_id === billing.unified_subscriptions?.mercadopago_subscription_id
        )
        return !existsInActive && billing.unified_subscriptions
      })
      .map(billing => {
        const subscription = billing.unified_subscriptions
        const product = subscription.products
        const frequency = subscription.frequency || 'monthly'
    
        // Descuento esperado (desde producto en BD)
        let expectedDiscount = 0
        if (product && frequency) {
          switch (frequency) {
            case 'monthly':
              expectedDiscount = product.monthly_discount || 0
              break
            case 'quarterly':
              expectedDiscount = product.quarterly_discount || 0
              break
            case 'annual':
              expectedDiscount = product.annual_discount || 0
              break
            case 'biweekly':
              expectedDiscount = product.biweekly_discount || 0
              break
            case 'weekly':
              expectedDiscount = product.weekly_discount || 0
              break
          }
        }
    
        const appliedDiscount = (typeof subscription.discount_percentage === 'number' && !Number.isNaN(subscription.discount_percentage))
          ? subscription.discount_percentage
          : expectedDiscount
    
        const basePrice = (product?.price ?? subscription.price ?? 0) as number
        const discountedPrice = Number((basePrice * (1 - (appliedDiscount || 0) / 100)).toFixed(2))
        
        return {
          id: `billing_${subscription.id}`,
          user_id: subscription.user_id,
          product_id: subscription.product_id,
          status: 'active',
          frequency,
          price: billing.amount,
          discount_amount: appliedDiscount,
          discount_percentage: appliedDiscount,
          base_price: basePrice,
          discounted_price: discountedPrice,
          expected_discount_percentage: expectedDiscount,
          applied_discount_percentage: appliedDiscount,
          discount_valid: appliedDiscount === expectedDiscount,
          next_billing_date: null,
          created_at: billing.billing_date,
          last_billing_date: billing.billing_date,
          source: 'billing_history',
          products: product,
          billing_info: {
            payment_id: billing.mercadopago_payment_id,
            payment_method: billing.payment_method,
            status: billing.status,
            amount: billing.amount
          }
        }
      })
    
    // Combinar y deduplicar
    const allSubscriptions = [
      ...processedActiveSubscriptions, 
      ...processedPendingSubscriptions,
      ...processedBillingSubscriptions
    ]
    
    const uniqueSubscriptions = allSubscriptions.filter((sub, index, self) =>
      index === self.findIndex(s => s.id === sub.id)
    )
    
    // Obtener perfiles de usuario
    const userIds = [...new Set(uniqueSubscriptions.map(sub => sub.user_id))].filter(Boolean)
    const { data: userProfiles } = await serviceClient
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds)
    
    // Agregar información del perfil a cada suscripción
    const subscriptionsWithProfiles = uniqueSubscriptions.map(sub => ({
      ...sub,
      user_profile: userProfiles?.find(profile => profile.id === sub.user_id)
    }))
    
    return NextResponse.json({
      success: true,
      data: subscriptionsWithProfiles,
      count: subscriptionsWithProfiles.length
    })
    
  } catch (error) {
    console.error('Error in admin subscriptions API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}