import fetch from 'node-fetch';

async function testEndpoint() {
  try {
    console.log('🧪 Probando endpoint create-without-plan...');
    
    const response = await fetch('http://localhost:3000/api/subscriptions/create-without-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 'test-user-123',
        product_id: 1,
        payer_email: 'test@example.com',
        external_reference: 'test-ref-123',
        subscription_type: 'monthly',
        reason: 'Test subscription',
        back_url: 'https://petgourmet.mx/perfil/suscripciones',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 299,
          currency_id: 'MXN'
        },
        status: 'pending'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('📊 Response:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error en la respuesta');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEndpoint();