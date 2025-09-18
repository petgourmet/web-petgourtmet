// Script para probar el envío de correos de suscripción
// Usar fetch nativo de Node.js 18+

async function testSubscriptionEmail() {
  console.log('🧪 Iniciando prueba de correo de suscripción...');
  
  const testData = {
    user_id: 'test-user-123',
    subscription_id: 'test-sub-456', 
    user_email: 'cristoferscalante@gmail.com',
    user_name: 'Cristofer Escalante',
    subscription_details: {
      product_name: 'Plan Premium Pet Gourmet',
      frequency_text: 'Mensual',
      discounted_price: 899.00,
      next_billing_date: '2024-02-15'
    },
    send_admin_notification: true
  };
  
  try {
    console.log('📤 Enviando solicitud de correo...');
    
    const response = await fetch('http://localhost:3000/api/subscriptions/send-thank-you-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📊 Respuesta del servidor:', {
      status: response.status,
      success: result.success,
      message: result.message,
      error: result.error,
      details: result.details
    });
    
    if (result.success) {
      console.log('✅ Correo enviado exitosamente!');
      console.log('📧 ID del correo:', result.email_id);
      if (result.admin_email_id) {
        console.log('📧 ID del correo admin:', result.admin_email_id);
      }
    } else {
      console.log('❌ Error enviando correo:', result.error);
      if (result.details) {
        console.log('🔍 Detalles:', result.details);
      }
    }
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testSubscriptionEmail();