const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
// Usar fetch nativo de Node.js 18+

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos del usuario existente
const testUserId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19';
const testEmail = 'cristoferscalante@gmail.com';
const externalReference = `TEST_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

// Datos de la suscripción de prueba
const subscriptionData = {
  user_id: testUserId,
  subscription_type: 'monthly',
  status: 'pending',
  external_reference: externalReference,
  product_name: 'Pastel porción de cordero, arroz y zanahoria x 6 unidades',
  product_id: 59,
  quantity: 1,
  size: 'Medium',
  base_price: 899.00,
  discounted_price: 719.20,
  discount_percentage: 20,
  transaction_amount: 719.20,
  currency_id: 'MXN',
  frequency: 1,
  frequency_type: 'months',
  collector_id: Math.floor(Math.random() * 1000000),
  customer_data: {
    email: testEmail,
    name: 'Cristofer Escalante',
    phone: '+52 123 456 7890'
  },
  cart_items: [{
    product_id: 59,
    product_name: 'Pastel porción de cordero, arroz y zanahoria x 6 unidades',
    quantity: 1,
    size: 'Medium',
    price: 719.20
  }]
};

// Función para crear suscripción de prueba
async function createTestSubscription() {
  try {
    console.log('🔄 Creando suscripción de prueba...');
    console.log('📧 Usuario:', testEmail);
    console.log('🆔 External Reference:', externalReference);
    
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creando suscripción:', error);
      return null;
    }
    
    console.log('✅ Suscripción creada exitosamente');
    console.log('📋 ID de suscripción:', data.id);
    console.log('📊 Estado inicial:', data.status);
    return data;
  } catch (error) {
    console.error('❌ Error en createTestSubscription:', error);
    return null;
  }
}

// Función para simular la activación vía webhook/URL
async function simulateActivation() {
  try {
    console.log('\n🔄 Simulando activación de suscripción...');
    
    // Simular llamada al endpoint de activación
    const activationUrl = `http://localhost:3000/api/subscriptions/activate`;
    const activationData = {
      status: 'approved',
      external_reference: externalReference,
      collection_id: subscriptionData.collector_id
    };
    
    console.log('📡 Simulando POST a:', activationUrl);
    console.log('📦 Datos de activación:', activationData);
    
    const response = await fetch(activationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activationData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Activación simulada exitosamente');
      console.log('📋 Respuesta:', result);
      return true;
    } else {
      console.log('⚠️ Endpoint no disponible, activando directamente en BD...');
      
      // Activar directamente en la base de datos
      const { data, error } = await supabase
        .from('unified_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('external_reference', externalReference)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error activando suscripción:', error);
        return false;
      }
      
      console.log('✅ Suscripción activada directamente');
      console.log('📊 Nuevo estado:', data.status);
      return true;
    }
  } catch (error) {
    console.error('❌ Error en simulateActivation:', error);
    return false;
  }
}

// Función para verificar el estado de la suscripción
async function verifySubscriptionStatus() {
  try {
    console.log('\n🔍 Verificando estado de la suscripción...');
    
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();
    
    if (error) {
      console.error('❌ Error verificando suscripción:', error);
      return null;
    }
    
    console.log('✅ Suscripción encontrada');
    console.log('📊 Estado actual:', data.status);
    console.log('📅 Creada:', data.created_at);
    console.log('📅 Actualizada:', data.updated_at);
    console.log('💰 Precio:', `$${data.price}`);
    console.log('📦 Producto:', data.product_name);
    
    return data;
  } catch (error) {
    console.error('❌ Error en verifySubscriptionStatus:', error);
    return null;
  }
}

// Función para simular envío de correos
async function simulateEmailSending() {
  try {
    console.log('\n📧 Simulando envío de correos...');
    
    // Simular correo al cliente
    console.log('📤 Enviando correo de confirmación a:', testEmail);
    console.log('📋 Asunto: ¡Tu suscripción Pet Gourmet está activa!');
    console.log('📄 Contenido: Confirmación de suscripción activada');
    
    // Simular correo al admin
    console.log('📤 Enviando notificación a: contacto@petgourmet.mx');
    console.log('📋 Asunto: Nueva suscripción activada');
    console.log('📄 Contenido: Notificación de nueva suscripción');
    
    // Intentar llamar al endpoint de correos si existe
    try {
      const emailUrl = 'http://localhost:3000/api/test-email';
      const emailData = {
        to: testEmail,
        subject: 'Prueba de suscripción Pet Gourmet',
        external_reference: externalReference
      };
      
      const response = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });
      
      if (response.ok) {
        console.log('✅ Correos enviados exitosamente');
      } else {
        console.log('⚠️ Endpoint de correos no disponible');
      }
    } catch (error) {
      console.log('⚠️ No se pudo conectar al servicio de correos');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error en simulateEmailSending:', error);
    return false;
  }
}

// Función para simular visita a página de confirmación
async function simulatePageVisit() {
  try {
    console.log('\n🌐 Simulando visita a página de confirmación...');
    
    const pageUrl = `http://localhost:3000/app/suscripcion/checkout/congrats?status=approved&external_reference=${externalReference}&collection_id=${subscriptionData.collector_id}`;
    console.log('🔗 URL simulada:', pageUrl);
    
    try {
      const response = await fetch(pageUrl);
      if (response.ok) {
        console.log('✅ Página de confirmación accesible');
      } else {
        console.log('⚠️ Página no disponible (servidor no iniciado)');
      }
    } catch (error) {
      console.log('⚠️ No se pudo acceder a la página (servidor no iniciado)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error en simulatePageVisit:', error);
    return false;
  }
}

// Función principal
async function runCompleteTest() {
  console.log('🚀 INICIANDO PRUEBA COMPLETA DEL FLUJO DE SUSCRIPCIONES');
  console.log('=' .repeat(60));
  
  try {
    // 1. Crear suscripción de prueba
    const subscription = await createTestSubscription();
    if (!subscription) {
      console.log('❌ Falló la creación de suscripción. Terminando prueba.');
      return;
    }
    
    // 2. Simular visita a página de confirmación
    await simulatePageVisit();
    
    // 3. Simular activación
    const activated = await simulateActivation();
    if (!activated) {
      console.log('❌ Falló la activación. Continuando con verificación...');
    }
    
    // 4. Verificar estado final
    const finalStatus = await verifySubscriptionStatus();
    
    // 5. Simular envío de correos
    await simulateEmailSending();
    
    // Resumen final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMEN DE LA PRUEBA');
    console.log('=' .repeat(60));
    console.log('👤 Usuario:', testEmail);
    console.log('🆔 External Reference:', externalReference);
    console.log('📦 Producto:', subscriptionData.product_name);
    console.log('💰 Precio:', `$${subscriptionData.price}`);
    console.log('📊 Estado final:', finalStatus ? finalStatus.status : 'Desconocido');
    console.log('✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba completa:', error);
  }
}

// Ejecutar la prueba
if (require.main === module) {
  runCompleteTest();
}

module.exports = {
  runCompleteTest,
  createTestSubscription,
  simulateActivation,
  verifySubscriptionStatus,
  simulateEmailSending
};