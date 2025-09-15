// Script de prueba para el flujo de suscripción
// Ejecutar con: node test-subscription-flow.js

const testSubscriptionFlow = async () => {
  console.log('🧪 Iniciando prueba del flujo de suscripción...');
  
  // Datos de prueba
  const testData = {
    external_reference: 'TEST_' + Date.now(),
    preapproval_id: 'TEST_PREAPPROVAL_' + Date.now()
  };
  
  try {
    console.log('📤 Enviando solicitud de activación...');
    console.log('Datos de prueba:', testData);
    
    const response = await fetch('http://localhost:3000/api/subscriptions/activate-landing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📥 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Endpoint funcionando correctamente');
      
      if (result.success) {
        console.log('🎉 Suscripción activada exitosamente');
        console.log('📧 Correos enviados:', result.emailsSent ? 'Sí' : 'No');
      } else {
        console.log('⚠️ Activación falló:', result.error);
      }
    } else {
      console.log('❌ Error en el endpoint:', response.status);
    }
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error.message);
  }
  
  console.log('\n🔍 Prueba de validación de parámetros...');
  
  // Prueba sin parámetros
  try {
    const response = await fetch('http://localhost:3000/api/subscriptions/activate-landing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('Sin parámetros - Status:', response.status);
    console.log('Sin parámetros - Resultado:', result.error || result.message);
    
  } catch (error) {
    console.error('Error en prueba sin parámetros:', error.message);
  }
  
  console.log('\n✨ Pruebas completadas');
};

// Verificar que el servidor esté corriendo
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('🚀 Servidor detectado en http://localhost:3000');
      await testSubscriptionFlow();
    } else {
      console.log('❌ Servidor no responde correctamente');
    }
  } catch (error) {
    console.log('❌ No se puede conectar al servidor. Asegúrate de que esté corriendo con "npm run dev"');
    console.log('Error:', error.message);
  }
};

// Ejecutar pruebas
checkServer();