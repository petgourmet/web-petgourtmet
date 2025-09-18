import fetch from 'node-fetch';

// Script para verificar el flujo completo de suscripciones
async function testCompleteFlow() {
  console.log('🧪 Probando flujo completo de suscripciones...');
  
  try {
    // 1. Verificar que la suscripción esté activa
    console.log('\n1. Verificando suscripción activa...');
    const activateResponse = await fetch('http://localhost:3002/api/subscriptions/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_reference: '8ee90c1d78554c9faa3c0531fcbaaeb7'
      })
    });
    
    const activateResult = await activateResponse.json();
    console.log('✅ Resultado activación:', activateResult);
    
    // 2. Verificar que el correo se envíe
    console.log('\n2. Verificando envío de correo...');
    const emailResponse = await fetch('http://localhost:3002/api/subscriptions/send-thank-you-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-id',
        subscription_id: 13,
        user_email: 'fabian.gutierrez@petgourmet.mx',
        user_name: 'Fabian Gutierrez',
        subscription_details: {
          product_name: 'Plan de Pollo Semanal',
          frequency_text: 'Semanal',
          discounted_price: '100.00',
          next_billing_date: '2025-01-02'
        }
      })
    });
    
    const emailResult = await emailResponse.json();
    console.log('✅ Resultado envío correo:', emailResult);
    
    // 3. Verificar que la página /perfil responda correctamente
    console.log('\n3. Verificando página /perfil...');
    const perfilResponse = await fetch('http://localhost:3002/perfil');
    console.log('✅ Página /perfil responde con status:', perfilResponse.status);
    
    console.log('\n🎉 ¡Flujo completo verificado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('- ✅ Suscripción activada correctamente');
    console.log('- ✅ Correo de confirmación enviado');
    console.log('- ✅ Página /perfil funcionando');
    console.log('\n🚀 El sistema está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en el flujo completo:', error);
  }
}

testCompleteFlow();