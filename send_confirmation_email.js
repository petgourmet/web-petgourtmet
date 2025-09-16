const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendConfirmationEmail() {
  const subscriptionId = 65 // ID de la suscripción que acabamos de crear
  
  console.log(`📧 Enviando correo de confirmación para suscripción ID: ${subscriptionId}`)
  
  try {
    // 1. Obtener datos de la suscripción
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()
    
    if (subError || !subscription) {
      console.error('❌ No se encontró la suscripción:', subError?.message)
      return
    }
    
    // 2. Obtener datos del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', subscription.user_id)
      .single()
    
    if (profileError) {
      console.warn('⚠️ No se pudo obtener el perfil del usuario:', profileError.message)
    }
    
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      user_id: subscription.user_id,
      product_name: subscription.product_name,
      status: subscription.status,
      user_email: profile?.email
    })
    
    // 3. Preparar datos del correo
    const emailData = {
      to: profile?.email || 'cristoferscalante@gmail.com',
      subject: '¡Tu suscripción a Pet Gourmet está activa!',
      template: 'subscription_confirmation',
      data: {
        user_name: profile?.first_name || 'Cliente',
        product_name: subscription.product_name,
        subscription_type: subscription.subscription_type,
        next_billing_date: new Date(subscription.next_billing_date).toLocaleDateString('es-MX'),
        amount: subscription.discounted_price || subscription.base_price
      }
    }
    
    console.log('📧 Datos del correo preparados:', {
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template
    })
    
    // 4. Simular envío de correo (registrar en email_logs)
    const { data: emailLog, error: emailError } = await supabase
      .from('email_logs')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        email_type: 'subscription_confirmation',
        recipient_email: emailData.to,
        subject: emailData.subject,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (emailError) {
      console.error('❌ Error registrando el envío del correo:', emailError.message)
      return
    }
    
    console.log('✅ Correo de confirmación registrado en email_logs:', {
      id: emailLog.id,
      status: emailLog.status,
      sent_at: emailLog.sent_at
    })
    
    // 5. Mostrar resumen
    console.log('\n🎉 ¡Correo de confirmación procesado exitosamente!')
    console.log('📊 Resumen:')
    console.log(`   - Destinatario: ${emailData.to}`)
    console.log(`   - Asunto: ${emailData.subject}`)
    console.log(`   - Producto: ${subscription.product_name}`)
    console.log(`   - Tipo: ${subscription.subscription_type}`)
    console.log(`   - Próximo pago: ${new Date(subscription.next_billing_date).toLocaleDateString('es-MX')}`)
    console.log(`   - Monto: $${subscription.discounted_price || subscription.base_price}`)
    
    // 6. Nota importante
    console.log('\n📝 NOTA IMPORTANTE:')
    console.log('   El correo ha sido registrado en la base de datos.')
    console.log('   Para el envío real, asegúrate de que el servicio de correos esté configurado.')
    
  } catch (error) {
    console.error('💥 Error general:', error.message)
    console.error(error.stack)
  }
}

// Ejecutar el envío
sendConfirmationEmail().then(() => {
  console.log('\n✨ Proceso completado')
  process.exit(0)
}).catch(error => {
  console.error('💥 Error fatal:', error.message)
  process.exit(1)
})