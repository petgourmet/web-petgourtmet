const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
// Usar fetch nativo de Node.js 18+

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de prueba - usar un usuario existente o crear uno nuevo
const testEmail = 'cristoferscalante@gmail.com';
const externalReference = `TEST_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
let testUserId = null;

const testData = {
  userId: '123e4567-e89b-12d3-a456-426614174000', // UUID de prueba
  email: testEmail,
  planType: 'mensual',
  productName: 'Plan de Pollo Semanal',
  price: 500.00,
  externalReference: externalReference,
  collectionId: '126695712040',
  paymentId: '126695712040',
  preferenceId: '1227980651-53d7f3d7-5970-473c-b28b-8dddedc64f89'
};

async function createTestSubscription() {
  console.log('🔄 Creando suscripción de prueba...');
  
  try {
    // 1. Buscar usuario existente o usar uno por defecto
    const { data: existingUsers, error: searchError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    if (searchError) {
      console.error('❌ Error buscando usuarios:', searchError);
      return false;
    }
    
    if (existingUsers && existingUsers.length > 0) {
      testUserId = existingUsers[0].id;
      console.log('✅ Usando usuario existente:', existingUsers[0].email, 'ID:', testUserId);
    } else {
      console.log('❌ No se encontraron usuarios existentes');
      return false;
    }
    
    // 2. Crear suscripción pendiente
    const subscriptionData = {
      user_id: testUserId,
      external_reference: testData.externalReference,
      plan_type: testData.planType,
      product_name: testData.productName,
      price: testData.price,
      status: 'pending',
      mercadopago_preference_id: testData.preferenceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (subError) {
      console.error('❌ Error creando suscripción:', subError);
      return false;
    }
    
    console.log('✅ Suscripción de prueba creada:', subscription.id);
    return subscription;
    
  } catch (error) {
    console.error('❌ Error en createTestSubscription:', error);
    return false;
  }
}

async function simulateApprovedPayment() {
  console.log('🔄 Simulando pago aprobado...');
  
  // Construir URL de prueba como la que envía MercadoPago
  const testUrl = `http://localhost:3000/subscriptions/checkout/congrats?` +
    `collection_id=${testData.collectionId}&` +
    `collection_status=approved&` +
    `preference_id=${testData.preferenceId}&` +
    `payment_type=credit_card&` +
    `payment_id=${testData.paymentId}&` +
    `external_reference=${testData.externalReference}&` +
    `site_id=MLM&` +
    `status=approved`;
  
  console.log('🌐 URL de prueba generada:');
  console.log(testUrl);
  
  try {
    // Simular la visita a la página de confirmación
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Test Bot)'
      }
    });
    
    if (response.ok) {
      console.log('✅ Página de confirmación accedida correctamente');
      return testUrl;
    } else {
      console.error('❌ Error accediendo a la página:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error simulando pago:', error);
    return false;
  }
}

async function verifySubscriptionActivation() {
  console.log('🔄 Verificando activación de suscripción...');
  
  // Esperar un poco para que se procese
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const { data: subscription, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', testData.externalReference)
      .single();
    
    if (error) {
      console.error('❌ Error verificando suscripción:', error);
      return false;
    }
    
    if (subscription.status === 'active') {
      console.log('✅ Suscripción activada correctamente');
      console.log('📊 Datos de la suscripción:', {
        id: subscription.id,
        status: subscription.status,
        plan_type: subscription.plan_type,
        price: subscription.price,
        activated_at: subscription.updated_at
      });
      return true;
    } else {
      console.log('⚠️ Suscripción aún pendiente:', subscription.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando activación:', error);
    return false;
  }
}

async function checkEmailLogs() {
  console.log('🔄 Verificando logs de correos...');
  
  try {
    // Verificar si hay logs de correos enviados
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('external_reference', testData.externalReference)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('⚠️ No se encontraron logs de correos (tabla puede no existir)');
      return true; // No es crítico
    }
    
    if (emailLogs && emailLogs.length > 0) {
      console.log('✅ Correos enviados:', emailLogs.length);
      emailLogs.forEach(log => {
        console.log(`📧 ${log.recipient}: ${log.subject} (${log.status})`);
      });
    } else {
      console.log('⚠️ No se encontraron logs de correos enviados');
    }
    
    return true;
  } catch (error) {
    console.log('⚠️ Error verificando correos:', error.message);
    return true; // No es crítico
  }
}

async function runCompleteTest() {
  console.log('🚀 Iniciando prueba completa del flujo de suscripciones\n');
  
  try {
    // Paso 1: Crear suscripción de prueba
    const subscription = await createTestSubscription();
    if (!subscription) {
      console.log('❌ Falló la creación de suscripción');
      return;
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Paso 2: Simular pago aprobado
    const testUrl = await simulateApprovedPayment();
    if (!testUrl) {
      console.log('❌ Falló la simulación de pago');
      return;
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Paso 3: Verificar activación
    const activated = await verifySubscriptionActivation();
    
    console.log('\n' + '='.repeat(50));
    
    // Paso 4: Verificar correos
    await checkEmailLogs();
    
    console.log('\n' + '='.repeat(50));
    
    // Resumen final
    console.log('\n📋 RESUMEN DE LA PRUEBA:');
    console.log('✅ Suscripción creada:', subscription.id);
    console.log('✅ URL de prueba:', testUrl);
    console.log(activated ? '✅ Suscripción activada' : '❌ Suscripción NO activada');
    console.log('📧 Correos esperados:');
    console.log('  - cristoferscalante@gmail.com (cliente)');
    console.log('  - contacto@petgourmet.mx (admin)');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Abrir la URL en el navegador para ver la página de aterrizaje');
    console.log('2. Verificar que muestre "Suscripción Activa"');
    console.log('3. Revisar las bandejas de entrada de ambos correos');
    
    console.log('\n🌐 URL para probar manualmente:');
    console.log(testUrl);
    
  } catch (error) {
    console.error('❌ Error en la prueba completa:', error);
  }
}

// Ejecutar la prueba
if (require.main === module) {
  runCompleteTest().then(() => {
    console.log('\n🏁 Prueba completada');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  createTestSubscription,
  simulateApprovedPayment,
  verifySubscriptionActivation,
  checkEmailLogs,
  runCompleteTest,
  testData
};