// Test script para verificar el endpoint de activación
// Usando fetch nativo de Node.js 18+

async function testEndpoint() {
  try {
    console.log('🔄 Probando endpoint /api/subscriptions/activate-landing...');
    
    const response = await fetch('http://localhost:3000/api/subscriptions/activate-landing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_reference: 'TEST_123',
        user_id: 'test-user-id'
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const result = await response.text();
    console.log('📄 Response:', result);
    
    if (response.ok) {
      console.log('✅ Endpoint funcionando correctamente');
    } else {
      console.log('❌ Error en el endpoint');
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testEndpoint();