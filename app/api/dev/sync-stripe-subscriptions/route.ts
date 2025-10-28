import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

export async function POST() {
  try {
    const supabase = await createClient()

    // Obtener todas las suscripciones de Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer', 'data.items.data.price.product']
    })

    console.log(`Found ${stripeSubscriptions.data.length} subscriptions in Stripe`)

    const results = []
    let created = 0
    let skipped = 0
    let errors = 0

    for (const sub of stripeSubscriptions.data) {
      try {
        const subData = sub as any
        
        // Verificar si ya existe en la BD
        const { data: existing } = await supabase
          .from('unified_subscriptions')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (existing) {
          console.log(`⏭️  Subscription ${sub.id} already exists`)
          skipped++
          continue
        }

        // Obtener customer data
        const customer = subData.customer
        const customerEmail = typeof customer === 'string' 
          ? (await stripe.customers.retrieve(customer) as any).email
          : customer.email

        // Obtener datos del producto
        const priceData = subData.items.data[0].price
        const product = priceData.product
        const productData = typeof product === 'string' 
          ? await stripe.products.retrieve(product)
          : product
        
        const productMetadata = (productData as any)?.metadata || {}
        const productId = productMetadata.product_id

        // Buscar user_id por email
        let userId = null
        if (customerEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single()
          
          if (profile) {
            userId = (profile as any).id
          }
        }

        // Calcular precios
        const unitAmount = priceData.unit_amount || 0
        const priceInMXN = unitAmount / 100

        // Obtener info del producto desde BD
        let productFromDB: any = null
        let basePrice = priceInMXN
        let discountPercentage = 0
        
        if (productId) {
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('id', parseInt(productId))
            .single()
          
          if (productData) {
            productFromDB = productData as any
            basePrice = (productData as any).price
            
            // Determinar el tipo de suscripción y descuento
            const interval = priceData.recurring?.interval || 'month'
            const intervalCount = priceData.recurring?.interval_count || 1
            
            let subscriptionType = 'monthly'
            if (interval === 'week') {
              subscriptionType = intervalCount === 1 ? 'weekly' : 'biweekly'
            } else if (interval === 'month') {
              subscriptionType = intervalCount === 3 ? 'quarterly' : 'monthly'
            } else if (interval === 'year') {
              subscriptionType = 'annual'
            }
            
            switch (subscriptionType) {
              case 'weekly':
                discountPercentage = (productData as any).weekly_discount || 0
                break
              case 'biweekly':
                discountPercentage = (productData as any).biweekly_discount || 0
                break
              case 'monthly':
                discountPercentage = (productData as any).monthly_discount || 0
                break
              case 'quarterly':
                discountPercentage = (productData as any).quarterly_discount || 0
                break
              case 'annual':
                discountPercentage = (productData as any).annual_discount || 0
                break
            }
          }
        }

        // Determinar frequency y frequency_type
        const interval = priceData.recurring?.interval || 'month'
        const intervalCount = priceData.recurring?.interval_count || 1
        
        let frequency = intervalCount
        let frequencyType = interval === 'week' ? 'weeks' : 'months'
        let subscriptionType = 'monthly'
        
        if (interval === 'week') {
          subscriptionType = intervalCount === 1 ? 'weekly' : 'biweekly'
          frequencyType = 'weeks'
        } else if (interval === 'month') {
          if (intervalCount === 3) {
            subscriptionType = 'quarterly'
            frequency = 3
          } else {
            subscriptionType = 'monthly'
            frequency = 1
          }
          frequencyType = 'months'
        } else if (interval === 'year') {
          subscriptionType = 'annual'
          frequency = 12
          frequencyType = 'months'
        }

        // Crear la suscripción en la BD
        const { data: newSub, error: insertError } = await supabase
          .from('unified_subscriptions')
          .insert({
            user_id: userId,
            customer_email: customerEmail,
            customer_name: (customer as any)?.name || null,
            product_id: productId ? parseInt(productId) : null,
            product_name: (productData as any)?.name || 'Suscripción Pet Gourmet',
            product_image: (productData as any)?.images?.[0] || productFromDB?.image || null,
            subscription_type: subscriptionType,
            status: subData.status,
            base_price: basePrice,
            discounted_price: priceInMXN,
            discount_percentage: discountPercentage,
            transaction_amount: priceInMXN,
            size: productMetadata.size || null,
            frequency: frequency,
            frequency_type: frequencyType,
            next_billing_date: subData.current_period_end 
              ? new Date(subData.current_period_end * 1000).toISOString()
              : null,
            last_billing_date: subData.current_period_start
              ? new Date(subData.current_period_start * 1000).toISOString()
              : null,
            current_period_start: subData.current_period_start
              ? new Date(subData.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subData.current_period_end
              ? new Date(subData.current_period_end * 1000).toISOString()
              : null,
            stripe_subscription_id: sub.id,
            stripe_customer_id: typeof customer === 'string' ? customer : customer.id,
            stripe_price_id: priceData.id,
            currency: subData.currency.toUpperCase(),
            cart_items: [{
              product_id: productId ? parseInt(productId) : null,
              product_name: (productData as any)?.name,
              name: (productData as any)?.name,
              image: (productData as any)?.images?.[0] || productFromDB?.image,
              price: priceInMXN,
              quantity: 1,
              size: productMetadata.size || null,
              isSubscription: true,
              subscriptionType: subscriptionType
            }],
            metadata: {
              synced_from_stripe: true,
              synced_at: new Date().toISOString()
            },
            created_at: new Date(subData.created * 1000).toISOString(),
            updated_at: new Date().toISOString()
          } as any)
          .select()
          .single()

        if (insertError) {
          console.error(`❌ Error inserting subscription ${sub.id}:`, insertError)
          errors++
          results.push({
            stripe_id: sub.id,
            status: 'error',
            error: insertError.message
          })
        } else {
          console.log(`✅ Created subscription ${sub.id} -> DB ID: ${(newSub as any).id}`)
          created++
          results.push({
            stripe_id: sub.id,
            db_id: (newSub as any).id,
            status: 'created'
          })
        }
      } catch (error: any) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error)
        errors++
        results.push({
          stripe_id: sub.id,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: stripeSubscriptions.data.length,
        created,
        skipped,
        errors
      },
      results
    })
  } catch (error: any) {
    console.error('Error syncing Stripe subscriptions:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al sincronizar suscripciones',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
