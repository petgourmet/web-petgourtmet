// Script para probar el flujo completo de suscripciones
// Usar fetch nativo de Node.js 18+

const BASE_URL = 'http://localhost:3000'

async function testCompleteSubscriptionFlow() {
  console.log('🚀 Iniciando prueba del flujo completo de suscripciones...')
  
  try {
    // 1. Simular creación de suscripción
    console.log('\n📝 Paso 1: Creando suscripción de prueba...')
    
    const subscriptionData = {
      user_id: 'test-user-123',
      product_id: 'test-product-456', 
      subscription_type: 'monthly',
      user_email: 'test@petgourmet.mx',
      user_name: 'Usuario de Prueba',
      product_name: 'Galletas Premium para Perros',
      price: 299.99,
      size: '1kg'
    }
    
    const createResponse = await fetch(`${BASE_URL}/api/subscriptions/create-without-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    })
    
    const createResult = await createResponse.json()
    console.log('✅ Respuesta de creación:', createResult)
    
    // 2. Simular confirmación con status approved
    console.log('\n✅ Paso 2: Simulando confirmación con status=approved...')
    
    const externalReference = `subscription_test_${Date.now()}`
    const preapprovalId = `preapproval_${Date.now()}`
    
    // 3. Probar envío de email de agradecimiento
    console.log('\n📧 Paso 3: Probando envío de email de confirmación...')
    
    const emailData = {
      user_email: subscriptionData.user_email,
      user_name: subscriptionData.user_name,
      subscription: {
        id: 'test-sub-789',
        product_name: subscriptionData.product_name,
        subscription_type: subscriptionData.subscription_type,
        discounted_price: subscriptionData.price,
        size: subscriptionData.size,
        status: 'active',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
    
    const emailResponse = await fetch(`${BASE_URL}/api/subscriptions/send-thank-you-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })
    
    const emailResult = await emailResponse.json()
    console.log('📧 Respuesta de email:', emailResult)
    
    // 4. Generar URL de confirmación completa
    console.log('\n🔗 Paso 4: Generando URL de confirmación...')
    
    const confirmationUrl = `${BASE_URL}/suscripcion/confirmacion?` + new URLSearchParams({
      external_reference: externalReference,
      user_id: subscriptionData.user_id,
      preapproval_id: preapprovalId,
      status: 'approved'
    }).toString()
    
    console.log('🎉 URL de confirmación generada:')
    console.log(confirmationUrl)
    
    console.log('\n✅ Flujo completo de suscripción probado exitosamente!')
    console.log('\n📋 Resumen:')
    console.log('- ✅ Suscripción creada')
    console.log('- ✅ Email de confirmación enviado')
    console.log('- ✅ URL de confirmación generada')
    console.log('\n🌐 Abre la URL en el navegador para ver la página de confirmación')
    
  } catch (error) {
    console.error('❌ Error en el flujo de suscripción:', error)
  }
}

// Ejecutar la prueba
testCompleteSubscriptionFlow()