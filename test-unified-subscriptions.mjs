import fetch from 'node-fetch';

async function testUnifiedSubscriptions() {
  console.log('🧪 Probando funcionalidades con tabla unified_subscriptions...');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. Probar endpoint de creación de suscripción sin plan
    console.log('\n1️⃣ Probando create-without-plan...');
    const createResponse = await fetch(`${baseUrl}/api/subscriptions/create-without-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 'test-user-unified-123',
        product_id: 1,
        payer_email: 'test-unified@example.com',
        external_reference: 'test-unified-ref-123',
        subscription_type: 'monthly',
        reason: 'Test unified subscription',
        back_url: 'https://petgourmet.mx/perfil/suscripciones',
        notification_url: 'https://petgourmet.mx/api/webhooks/mercadopago',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 299.99,
          currency_id: 'MXN'
        }
      })
    });
    
    const createResult = await createResponse.json();
    console.log('✅ Create response:', createResult.success ? 'SUCCESS' : 'FAILED');
    if (!createResult.success) {
      console.log('❌ Error:', createResult.error);
    }
    
    // 2. Probar endpoint de validación de preaprobación
    console.log('\n2️⃣ Probando validate-preapproval...');
    const validateResponse = await fetch(`${baseUrl}/api/subscriptions/validate-preapproval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preapproval_id: 'test-preapproval-123',
        external_reference: 'test-unified-ref-123'
      })
    });
    
    let validateResult;
    try {
      validateResult = await validateResponse.json();
      console.log('✅ Validate response:', validateResult.success ? 'SUCCESS' : 'FAILED');
      if (!validateResult.success) {
        console.log('❌ Error:', validateResult.error);
      }
    } catch (jsonError) {
      console.log('❌ Error parsing JSON response:', jsonError.message);
      console.log('Response status:', validateResponse.status);
    }
    
    // 3. Probar endpoint de suscripciones de usuario (simulando un usuario existente)
    console.log('\n3️⃣ Probando user subscriptions endpoint...');
    const userResponse = await fetch(`${baseUrl}/api/subscriptions/user/test-user-unified-123`);
    const userResult = await userResponse.json();
    console.log('✅ User subscriptions response:', userResult.success ? 'SUCCESS' : 'FAILED');
    if (!userResult.success) {
      console.log('❌ Error:', userResult.error);
    } else {
      console.log('📊 Subscriptions found:', userResult.subscriptions?.length || 0);
    }
    
    console.log('\n🎉 Pruebas completadas!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

testUnifiedSubscriptions();