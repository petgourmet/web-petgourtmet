/**
 * HERRAMIENTA DE ACTIVACIÓN MANUAL DE SUSCRIPCIONES
 * 
 * Esta herramienta permite activar manualmente suscripciones que no se activaron
 * automáticamente debido a problemas en el flujo de webhooks o pagos.
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
require('dotenv').config()

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuración de email
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

async function activateSubscriptionManually(subscriptionId, options = {}) {
  const { 
    force = false, 
    sendEmail = true, 
    createBilling = true,
    dryRun = false 
  } = options

  console.log('🔧 ACTIVACIÓN MANUAL DE SUSCRIPCIÓN')
  console.log('=' .repeat(50))
  console.log(`Subscription ID: ${subscriptionId}`)
  console.log(`Dry Run: ${dryRun ? 'SÍ' : 'NO'}`)
  console.log('=' .repeat(50))

  try {
    // 1. Obtener la suscripción
    console.log('\n📋 1. OBTENIENDO SUSCRIPCIÓN')
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subError) {
      throw new Error(`Error obteniendo suscripción: ${subError.message}`)
    }

    if (!subscription) {
      throw new Error('Suscripción no encontrada')
    }

    console.log('✅ Suscripción encontrada:')
    console.log(`  - Status actual: ${subscription.status}`)
    console.log(`  - Email: ${subscription.customer_email || 'N/A'}`)
    console.log(`  - Producto: ${subscription.product_name || 'N/A'}`)
    console.log(`  - Precio: ${subscription.price || 'N/A'}`)
    console.log(`  - External Ref: ${subscription.external_reference || 'N/A'}`)

    // 2. Verificar si ya está activa
    if (subscription.status === 'active' && !force) {
      console.log('⚠️ La suscripción ya está activa. Use --force para forzar reactivación.')
      return { success: false, reason: 'already_active' }
    }

    // 3. Verificar estado en MercadoPago (si existe external_reference)
    let mpVerified = false
    if (subscription.external_reference) {
      console.log('\n💳 2. VERIFICANDO MERCADOPAGO')
      try {
        const mpResponse = await fetch(
          `https://api.mercadopago.com/preapproval/${subscription.external_reference}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
          }
        )

        if (mpResponse.ok) {
          const mpData = await mpResponse.json()
          console.log(`✅ Estado en MercadoPago: ${mpData.status}`)
          mpVerified = ['authorized', 'approved', 'active'].includes(mpData.status)
          
          if (!mpVerified && !force) {
            console.log('⚠️ El pago no está autorizado en MercadoPago. Use --force para activar de todos modos.')
            return { success: false, reason: 'payment_not_authorized' }
          }
        } else {
          console.log(`⚠️ No se pudo verificar MercadoPago: ${mpResponse.status}`)
        }
      } catch (mpError) {
        console.log(`⚠️ Error verificando MercadoPago: ${mpError.message}`)
      }
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No se realizarán cambios reales')
      console.log('Acciones que se realizarían:')
      console.log('  ✓ Activar suscripción')
      if (createBilling) console.log('  ✓ Crear registro de facturación')
      if (sendEmail) console.log('  ✓ Enviar email de confirmación')
      return { success: true, dryRun: true }
    }

    // 4. Activar la suscripción
    console.log('\n🚀 3. ACTIVANDO SUSCRIPCIÓN')
    const now = new Date()
    const nextBillingDate = new Date(now)
    
    // Calcular próxima fecha de facturación
    if (subscription.product_name?.toLowerCase().includes('mensual')) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    } else if (subscription.product_name?.toLowerCase().includes('anual')) {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1) // Default mensual
    }

    const updateData = {
      status: 'active',
      next_billing_date: nextBillingDate.toISOString(),
      charges_made: (subscription.charges_made || 0) + 1,
      updated_at: now.toISOString()
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error actualizando suscripción: ${updateError.message}`)
    }

    console.log('✅ Suscripción activada exitosamente')

    // 5. Crear registro de facturación
    if (createBilling) {
      console.log('\n💰 4. CREANDO REGISTRO DE FACTURACIÓN')
      const { error: billingError } = await supabase
        .from('subscription_billing_history')
        .insert({
          subscription_id: subscriptionId,
          user_id: subscription.user_id,
          amount: subscription.price || 0,
          currency: 'MXN',
          status: 'completed',
          payment_method: 'mercadopago',
          external_payment_id: subscription.external_reference,
          billing_date: now.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          metadata: {
            manual_activation: true,
            activation_timestamp: now.toISOString(),
            mercadopago_verified: mpVerified,
            activated_by: 'manual-script'
          }
        })

      if (billingError) {
        console.log(`⚠️ Error creando billing: ${billingError.message}`)
      } else {
        console.log('✅ Registro de facturación creado')
      }
    }

    // 6. Enviar email de confirmación
    if (sendEmail && subscription.customer_email) {
      console.log('\n📧 5. ENVIANDO EMAIL DE CONFIRMACIÓN')
      try {
        const transporter = createEmailTransporter()
        
        const mailOptions = {
          from: process.env.SMTP_FROM || 'noreply@petgourmet.com',
          to: subscription.customer_email,
          subject: '🎉 ¡Tu suscripción a PetGourmet está activa!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">¡Bienvenido a PetGourmet! 🐾</h2>
              <p>¡Excelentes noticias! Tu suscripción ha sido activada exitosamente.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles de tu suscripción:</h3>
                <p><strong>Plan:</strong> ${subscription.product_name || 'Plan Premium'}</p>
                <p><strong>Precio:</strong> $${subscription.price} MXN</p>
                <p><strong>Estado:</strong> Activa ✅</p>
                <p><strong>Próximo pago:</strong> ${nextBillingDate.toLocaleDateString('es-MX')}</p>
              </div>
              
              <p>Ahora puedes disfrutar de todos los beneficios de tu suscripción:</p>
              <ul>
                <li>🥘 Comida premium para tu mascota</li>
                <li>🚚 Entregas automáticas</li>
                <li>💰 Precios preferenciales</li>
                <li>🎯 Atención personalizada</li>
              </ul>
              
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
              
              <p style="margin-top: 30px;">¡Gracias por confiar en PetGourmet!</p>
              <p><strong>El equipo de PetGourmet</strong></p>
            </div>
          `
        }

        await transporter.sendMail(mailOptions)
        console.log('✅ Email de confirmación enviado')
      } catch (emailError) {
        console.log(`⚠️ Error enviando email: ${emailError.message}`)
      }
    }

    // 7. Resumen final
    console.log('\n🎉 ACTIVACIÓN COMPLETADA')
    console.log('=' .repeat(30))
    console.log(`✅ Suscripción ${subscriptionId} activada exitosamente`)
    console.log(`📅 Próximo pago: ${nextBillingDate.toLocaleDateString('es-MX')}`)
    console.log(`💰 Facturación: ${createBilling ? 'Creada' : 'Omitida'}`)
    console.log(`📧 Email: ${sendEmail && subscription.customer_email ? 'Enviado' : 'Omitido'}`)

    return {
      success: true,
      subscription: updatedSub,
      nextBillingDate: nextBillingDate.toISOString(),
      emailSent: sendEmail && subscription.customer_email,
      billingCreated: createBilling
    }

  } catch (error) {
    console.error('❌ Error durante la activación:', error.message)
    return { success: false, error: error.message }
  }
}

// Función para activar por external_reference
async function activateByExternalReference(externalRef, options = {}) {
  console.log(`🔍 Buscando suscripción con external_reference: ${externalRef}`)
  
  const { data: subscriptions, error } = await supabase
    .from('unified_subscriptions')
    .select('id')
    .eq('external_reference', externalRef)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Error buscando suscripción: ${error.message}`)
  }

  if (!subscriptions || subscriptions.length === 0) {
    throw new Error('No se encontró suscripción con ese external_reference')
  }

  return activateSubscriptionManually(subscriptions[0].id, options)
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Uso:')
    console.log('  node manual-activate.js <subscription_id> [opciones]')
    console.log('  node manual-activate.js --external-ref <external_reference> [opciones]')
    console.log('')
    console.log('Opciones:')
    console.log('  --force          Forzar activación aunque ya esté activa')
    console.log('  --no-email       No enviar email de confirmación')
    console.log('  --no-billing     No crear registro de facturación')
    console.log('  --dry-run        Solo mostrar qué se haría, sin hacer cambios')
    console.log('')
    console.log('Ejemplos:')
    console.log('  node manual-activate.js 123e4567-e89b-12d3-a456-426614174000')
    console.log('  node manual-activate.js --external-ref 643f69a22e5542c183f86d5114848662 --force')
    process.exit(1)
  }

  const options = {
    force: args.includes('--force'),
    sendEmail: !args.includes('--no-email'),
    createBilling: !args.includes('--no-billing'),
    dryRun: args.includes('--dry-run')
  }

  if (args.includes('--external-ref')) {
    const refIndex = args.indexOf('--external-ref') + 1
    if (refIndex >= args.length) {
      console.error('❌ Falta el external_reference después de --external-ref')
      process.exit(1)
    }
    const externalRef = args[refIndex]
    activateByExternalReference(externalRef, options)
      .then(result => {
        if (result.success) {
          console.log('\n🎉 Proceso completado exitosamente')
        } else {
          console.log(`\n❌ Proceso falló: ${result.error || result.reason}`)
          process.exit(1)
        }
      })
      .catch(error => {
        console.error('❌ Error:', error.message)
        process.exit(1)
      })
  } else {
    const subscriptionId = args[0]
    activateSubscriptionManually(subscriptionId, options)
      .then(result => {
        if (result.success) {
          console.log('\n🎉 Proceso completado exitosamente')
        } else {
          console.log(`\n❌ Proceso falló: ${result.error || result.reason}`)
          process.exit(1)
        }
      })
      .catch(error => {
        console.error('❌ Error:', error.message)
        process.exit(1)
      })
  }
}

module.exports = { 
  activateSubscriptionManually, 
  activateByExternalReference 
}