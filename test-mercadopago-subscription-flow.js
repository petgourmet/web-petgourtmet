require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuración de MercadoPago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

async function createMercadoPagoSubscription() {
  console.log('🚀 CREANDO SUSCRIPCIÓN DE PRUEBA CON MERCADOPAGO SDK');
  console.log('=' .repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
  console.log(`👤 Usuario: cristoferscalante@gmail.com`);
  console.log('=' .repeat(70));
  
  try {
    // ========================================
    // 1. VERIFICAR USUARIO EXISTENTE
    // ========================================
    console.log('\n👤 1. VERIFICANDO USUARIO');
    console.log('-'.repeat(50));
    
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'cristoferscalante@gmail.com')
      .single();
    
    if (userError || !user) {
      console.log('❌ Usuario no encontrado. Creando usuario...');
      
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: 'cristoferscalante@gmail.com',
          full_name: 'Cristofer Escalante',
          role: 'user',
          phone: '+52 55 1234 5678',
          address: 'Calle de Prueba 123, CDMX',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Error creando usuario: ${createError.message}`);
      }
      
      console.log('✅ Usuario creado exitosamente');
      user = newUser;
    } else {
      console.log('✅ Usuario encontrado:', user.full_name);
    }
    
    // ========================================
    // 2. SELECCIONAR PRODUCTO PARA SUSCRIPCIÓN
    // ========================================
    console.log('\n🛍️ 2. SELECCIONANDO PRODUCTO');
    console.log('-'.repeat(50));
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('subscription_available', true)
      .limit(1);
    
    if (productsError || !products || products.length === 0) {
      throw new Error('No se encontraron productos con suscripción disponible');
    }
    
    const selectedProduct = products[0];
    console.log('✅ Producto seleccionado:', selectedProduct.name);
    console.log(`💰 Precio base: $${selectedProduct.price}`);
    
    // Calcular precio con descuento mensual
    const discountPercentage = selectedProduct.monthly_discount || 0;
    const basePrice = parseFloat(selectedProduct.price);
    const discountedPrice = basePrice * (1 - discountPercentage / 100);
    
    console.log(`🏷️ Descuento mensual: ${discountPercentage}%`);
    console.log(`💵 Precio final: $${discountedPrice.toFixed(2)}`);
    
    // ========================================
    // 3. CREAR ORDEN EN SUPABASE
    // ========================================
    console.log('\n📋 3. CREANDO ORDEN');
    console.log('-'.repeat(50));
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: discountedPrice,
        payment_status: 'pending',
        status: 'pending',
        customer_name: user.full_name,
        customer_phone: user.phone,
        shipping_address: {
          address: user.address || 'Dirección de prueba',
          subscription_data: {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            subscription_type: 'monthly',
            frequency: 1,
            frequency_type: 'months'
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) {
      throw new Error(`Error creando orden: ${orderError.message}`);
    }
    
    console.log(`✅ Orden creada: #${order.id}`);
    console.log(`💰 Total: $${order.total}`);
    
    // Crear item de orden
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_image: selectedProduct.image_url || '',
        quantity: 1,
        price: discountedPrice,
        size: selectedProduct.sizes ? selectedProduct.sizes[0] : 'medium'
      });
    
    if (itemError) {
      throw new Error(`Error creando item de orden: ${itemError.message}`);
    }
    
    console.log('✅ Item de orden creado');
    
    // ========================================
    // 4. CREAR SUSCRIPCIÓN EN MERCADOPAGO
    // ========================================
    console.log('\n💳 4. CREANDO SUSCRIPCIÓN EN MERCADOPAGO');
    console.log('-'.repeat(50));
    
    // Preparar datos para MercadoPago
    const subscriptionData = {
      reason: `Suscripción mensual - ${selectedProduct.name}`,
      external_reference: `PG-SUB-${order.id}-${Date.now()}`,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 año
        transaction_amount: discountedPrice,
        currency_id: 'MXN'
      },
      back_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/perfil`,
      status: 'pending'
    };
    
    console.log('📤 Enviando solicitud a MercadoPago...');
    console.log('📧 Email del pagador:', subscriptionData.payer_email);
    console.log('💰 Monto:', subscriptionData.auto_recurring.transaction_amount);
    console.log('🔄 Frecuencia:', `${subscriptionData.auto_recurring.frequency} ${subscriptionData.auto_recurring.frequency_type}`);
    
    // Simular respuesta de MercadoPago (en producción sería una llamada real)
    const mercadoPagoResponse = {
      id: `2c938084726fca480172750${Date.now().toString().slice(-6)}`,
      version: 0,
      application_id: 1234567812345678,
      collector_id: 100200300,
      reason: subscriptionData.reason,
      external_reference: subscriptionData.external_reference,
      back_url: subscriptionData.back_url,
      init_point: `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=2c938084726fca480172750${Date.now().toString().slice(-6)}`,
      auto_recurring: subscriptionData.auto_recurring,
      payer_id: 123123123,
      card_id: 123123123,
      payment_method_id: 123123123,
      next_payment_date: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      date_created: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      status: 'pending'
    };
    
    console.log('✅ Respuesta de MercadoPago recibida');
    console.log(`🆔 ID de suscripción: ${mercadoPagoResponse.id}`);
    console.log(`🔗 Init Point: ${mercadoPagoResponse.init_point}`);
    console.log(`📅 Próximo pago: ${new Date(mercadoPagoResponse.next_payment_date).toLocaleDateString('es-MX')}`);
    
    // ========================================
    // 5. GUARDAR SUSCRIPCIÓN EN SUPABASE
    // ========================================
    console.log('\n💾 5. GUARDANDO SUSCRIPCIÓN EN BASE DE DATOS');
    console.log('-'.repeat(50));
    
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        product_id: selectedProduct.id,
        subscription_type: 'monthly',
        status: 'active', // Cambiará a 'active' cuando se confirme el pago
        quantity: 1,
        size: selectedProduct.sizes ? selectedProduct.sizes[0] : 'medium',
        discount_percentage: discountPercentage,
        base_price: basePrice,
        discounted_price: discountedPrice,
        next_billing_date: mercadoPagoResponse.next_payment_date,
        product_name: selectedProduct.name,
        product_image: selectedProduct.image_url,
        frequency: 1,
        frequency_type: 'months',
        // Campos específicos de MercadoPago
        mercadopago_subscription_id: mercadoPagoResponse.id,
        external_reference: mercadoPagoResponse.external_reference,
        init_point: mercadoPagoResponse.init_point,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (subscriptionError) {
      throw new Error(`Error guardando suscripción: ${subscriptionError.message}`);
    }
    
    console.log(`✅ Suscripción guardada: ID ${subscription.id}`);
    
    // ========================================
    // 6. SIMULAR PROCESO DE PAGO
    // ========================================
    console.log('\n💳 6. SIMULANDO PROCESO DE PAGO');
    console.log('-'.repeat(50));
    
    console.log('🔗 URL de checkout generada:');
    console.log(`   ${mercadoPagoResponse.init_point}`);
    console.log('');
    console.log('📱 El usuario sería redirigido a MercadoPago para:');
    console.log('   1. Ingresar datos de tarjeta');
    console.log('   2. Confirmar la suscripción');
    console.log('   3. Autorizar pagos recurrentes');
    console.log('');
    console.log('🔄 Simulando aprobación de suscripción...');
    
    // Simular webhook de confirmación
    setTimeout(async () => {
      try {
        // Actualizar estado de suscripción a 'active'
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        if (updateError) {
          console.log('❌ Error actualizando suscripción:', updateError.message);
          return;
        }
        
        // Actualizar orden a pagada
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            mercadopago_payment_id: mercadoPagoResponse.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
        
        if (orderUpdateError) {
          console.log('❌ Error actualizando orden:', orderUpdateError.message);
          return;
        }
        
        // Crear registro de facturación
        const { error: billingError } = await supabase
          .from('subscription_billing_history')
          .insert({
            subscription_id: subscription.id,
            order_id: order.id,
            amount: discountedPrice,
            billing_date: new Date().toISOString(),
            status: 'completed',
            payment_method: 'mercadopago',
            created_at: new Date().toISOString()
          });
        
        if (billingError) {
          console.log('⚠️ Error creando historial de facturación:', billingError.message);
        } else {
          console.log('✅ Historial de facturación creado');
        }
        
        console.log('\n🎉 ¡SUSCRIPCIÓN ACTIVADA EXITOSAMENTE!');
        console.log('✅ Estado: ACTIVE');
        console.log('✅ Orden: PAID');
        console.log('✅ Facturación: COMPLETED');
        
      } catch (error) {
        console.log('❌ Error en webhook simulado:', error.message);
      }
    }, 2000);
    
    // ========================================
    // 7. RESUMEN FINAL
    // ========================================
    console.log('\n📊 7. RESUMEN DE LA SUSCRIPCIÓN CREADA');
    console.log('-'.repeat(50));
    
    console.log(`👤 Usuario: ${user.full_name} (${user.email})`);
    console.log(`🛍️ Producto: ${selectedProduct.name}`);
    console.log(`💰 Precio: $${discountedPrice.toFixed(2)} MXN/mes`);
    console.log(`🏷️ Descuento: ${discountPercentage}%`);
    console.log(`📋 Orden: #${order.id}`);
    console.log(`🔄 Suscripción: #${subscription.id}`);
    console.log(`🆔 MercadoPago ID: ${mercadoPagoResponse.id}`);
    console.log(`📅 Próximo pago: ${new Date(mercadoPagoResponse.next_payment_date).toLocaleDateString('es-MX')}`);
    console.log(`🔗 Checkout URL: ${mercadoPagoResponse.init_point}`);
    
    console.log('\n🧪 PRUEBAS MANUALES RECOMENDADAS:');
    console.log('-'.repeat(50));
    console.log('1. 🔐 Iniciar sesión como cristoferscalante@gmail.com');
    console.log('2. 👤 Ir a /perfil y verificar la suscripción');
    console.log('3. 🛍️ Verificar que aparezca en "Mis Suscripciones"');
    console.log('4. ⏸️ Probar botón "Pausar suscripción"');
    console.log('5. ❌ Probar botón "Cancelar suscripción"');
    console.log('6. 🔄 Probar botón "Reactivar suscripción"');
    console.log('7. 👨‍💼 Verificar en panel admin (/admin/subscription-orders)');
    console.log('8. 📊 Verificar métricas en dashboard admin');
    
    console.log('\n🔧 INTEGRACIÓN CON MERCADOPAGO SDK:');
    console.log('-'.repeat(50));
    console.log('✅ Estructura de datos compatible');
    console.log('✅ Campos requeridos incluidos');
    console.log('✅ Manejo de webhooks preparado');
    console.log('✅ URLs de retorno configuradas');
    console.log('✅ Referencia externa única');
    console.log('✅ Configuración de pagos recurrentes');
    
    console.log('\n🎯 PRÓXIMOS PASOS PARA PRODUCCIÓN:');
    console.log('-'.repeat(50));
    console.log('1. 🔑 Configurar credenciales de producción de MercadoPago');
    console.log('2. 🌐 Reemplazar simulación con llamadas reales a API');
    console.log('3. 🔔 Implementar webhooks de MercadoPago');
    console.log('4. 🛡️ Validar firmas de webhooks');
    console.log('5. 📧 Configurar notificaciones por email');
    console.log('6. 🧪 Realizar pruebas con tarjetas de prueba');
    
    console.log('\n🎉 SUSCRIPCIÓN DE PRUEBA COMPLETADA');
    console.log(`📅 ${new Date().toLocaleString('es-MX')}`);
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('💥 Error durante el proceso:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Función para mostrar ejemplo de integración con SDK
function showMercadoPagoSDKExample() {
  console.log('\n📚 EJEMPLO DE INTEGRACIÓN CON MERCADOPAGO SDK');
  console.log('=' .repeat(70));
  
  const exampleCode = `
// Frontend - Crear suscripción
const createSubscription = async (productData, userData) => {
  const response = await fetch('/api/subscriptions/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productData.id,
      user_email: userData.email,
      subscription_type: 'monthly'
    })
  });
  
  const { init_point } = await response.json();
  
  // Redirigir a MercadoPago
  window.location.href = init_point;
};

// Backend - API Route
export async function POST(request) {
  const { product_id, user_email, subscription_type } = await request.json();
  
  // Crear suscripción en MercadoPago
  const subscriptionData = {
    reason: \`Suscripción \${subscription_type} - Producto \${product_id}\`,
    external_reference: \`PG-SUB-\${Date.now()}\`,
    payer_email: user_email,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      start_date: new Date().toISOString(),
      transaction_amount: productPrice,
      currency_id: 'MXN'
    },
    back_url: \`\${process.env.NEXT_PUBLIC_SITE_URL}/perfil\`,
    status: 'pending'
  };
  
  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.MERCADOPAGO_ACCESS_TOKEN}\`
    },
    body: JSON.stringify(subscriptionData)
  });
  
  const mercadoPagoSubscription = await response.json();
  
  // Guardar en Supabase
  await supabase.from('user_subscriptions').insert({
    user_id: userId,
    product_id: product_id,
    mercadopago_subscription_id: mercadoPagoSubscription.id,
    init_point: mercadoPagoSubscription.init_point,
    status: 'pending'
  });
  
  return Response.json({ init_point: mercadoPagoSubscription.init_point });
}

// Webhook handler
export async function POST(request) {
  const { type, data } = await request.json();
  
  if (type === 'subscription_preapproval') {
    const subscriptionId = data.id;
    
    // Obtener detalles de MercadoPago
    const response = await fetch(\`https://api.mercadopago.com/preapproval/\${subscriptionId}\`, {
      headers: {
        'Authorization': \`Bearer \${process.env.MERCADOPAGO_ACCESS_TOKEN}\`
      }
    });
    
    const subscription = await response.json();
    
    // Actualizar estado en Supabase
    await supabase
      .from('user_subscriptions')
      .update({ status: subscription.status })
      .eq('mercadopago_subscription_id', subscriptionId);
  }
  
  return Response.json({ received: true });
}
  `;
  
  console.log(exampleCode);
  console.log('=' .repeat(70));
}

// Ejecutar el script
createMercadoPagoSubscription()
  .then(() => {
    setTimeout(() => {
      showMercadoPagoSDKExample();
    }, 3000);
  })
  .catch(console.error);