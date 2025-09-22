const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Datos del usuario de prueba
const testUser = {
  id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com',
  full_name: 'Cristofer Escalante',
  first_name: 'Cristofer',
  last_name: 'Escalante'
};

// Simular producto de suscripción en el carrito
const subscriptionItem = {
  id: 'test-product-1',
  name: 'Alimento Premium Perro Adulto',
  price: 500,
  quantity: 1,
  size: 'Standard',
  image: 'https://example.com/product.jpg',
  category: 'pet-food',
  isSubscription: true,
  subscriptionType: 'monthly'
};

// Información del cliente
const customerInfo = {
  firstName: 'Cristofer',
  lastName: 'Escalante',
  email: 'cristoferscalante@gmail.com',
  phone: '+52 123 456 7890'
};

// Dirección de envío
const shippingAddress = {
  street_name: 'carrera36#50-40',
  street_number: 'carrera36#50-40',
  zip_code: '170004',
  city: 'manizales',
  state: 'Caldas',
  country: 'México'
};

// Función para calcular descuento
function getProductSubscriptionDiscount(item, subscriptionType) {
  const discounts = {
    'monthly': 0.05,    // 5%
    'quarterly': 0.10,  // 10%
    'annual': 0.15,     // 15%
    'biweekly': 0.03    // 3%
  };
  return discounts[subscriptionType] || 0;
}

// Función principal para simular el checkout
async function simulateCheckoutFlow() {
  console.log('🚀 Iniciando simulación del flujo de checkout...');
  console.log('Usuario:', testUser.email);
  console.log('Producto:', subscriptionItem.name);
  console.log('Tipo de suscripción:', subscriptionItem.subscriptionType);
  
  try {
    // Paso 1: Generar external_reference como en el código real
    const orderNumber = `ORD-${Date.now()}`;
    const timestamp = Date.now();
    const userId = testUser.id;
    const planId = subscriptionItem.id;
    const externalReference = `PG-SUB-${timestamp}-${userId}-${planId}`;
    
    console.log('\n📝 External Reference generado:', externalReference);
    
    // Paso 2: Calcular precios como en el código real
    const subscriptionType = subscriptionItem.subscriptionType;
    const discount = getProductSubscriptionDiscount(subscriptionItem, subscriptionType);
    const basePrice = subscriptionItem.price;
    const discountPercentage = discount * 100;
    const discountedPrice = basePrice * (1 - discount);
    const transactionAmount = discountedPrice * subscriptionItem.quantity;
    
    console.log('💰 Cálculos de precio:');
    console.log('  - Precio base:', basePrice);
    console.log('  - Descuento:', discountPercentage + '%');
    console.log('  - Precio con descuento:', discountedPrice);
    console.log('  - Monto total:', transactionAmount);
    
    // Paso 3: Calcular frequency y frequency_type
    let frequency = 1;
    let frequency_type = 'months';
    
    switch (subscriptionType) {
      case 'monthly':
        frequency = 1;
        frequency_type = 'months';
        break;
      case 'quarterly':
        frequency = 3;
        frequency_type = 'months';
        break;
      case 'annual':
        frequency = 12;
        frequency_type = 'months';
        break;
      case 'biweekly':
        frequency = 2;
        frequency_type = 'weeks';
        break;
    }
    
    // Paso 4: Calcular fechas
    const currentDate = new Date();
    const startDate = currentDate.toISOString();
    const nextBillingDate = new Date(currentDate);
    
    if (frequency_type === 'months') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + frequency);
    } else if (frequency_type === 'weeks') {
      nextBillingDate.setDate(nextBillingDate.getDate() + (frequency * 7));
    }
    
    // Paso 5: Crear el objeto de datos exacto como en el código
    const subscriptionData = {
      user_id: testUser.id,
      product_id: subscriptionItem.id,
      product_name: subscriptionItem.name,
      product_image: subscriptionItem.image,
      subscription_type: subscriptionType,
      status: 'pending',
      external_reference: externalReference,
      base_price: basePrice,
      discounted_price: discountedPrice,
      discount_percentage: discountPercentage,
      transaction_amount: transactionAmount,
      size: subscriptionItem.size || 'Standard',
      quantity: subscriptionItem.quantity,
      frequency: frequency,
      frequency_type: frequency_type,
      currency_id: 'MXN',
      start_date: startDate,
      next_billing_date: nextBillingDate.toISOString(),
      back_url: 'https://petgourmet.mx/suscripcion',
      reason: `Suscripción ${subscriptionType} - ${subscriptionItem.name} (${subscriptionItem.size || 'Standard'})`,
      version: 1,
      collector_id: null,
      charges_made: 0,
      application_id: null,
      preapproval_plan_id: null,
      init_point: null,
      end_date: null,
      mercadopago_subscription_id: null,
      mercadopago_plan_id: null,
      last_billing_date: null,
      cancelled_at: null,
      paused_at: null,
      resumed_at: null,
      expired_at: null,
      suspended_at: null,
      last_sync_at: null,
      processed_at: new Date().toISOString(),
      free_trial: null,
      notes: `Suscripción creada desde checkout - ${subscriptionType}`,
      metadata: {
        subscription_type: subscriptionType,
        product_category: subscriptionItem.category || 'pet-food',
        discount_applied: discountPercentage > 0,
        original_price: basePrice,
        final_price: discountedPrice,
        size: subscriptionItem.size || 'Standard',
        created_from: 'checkout_modal_simulation',
        user_agent: 'Node.js Simulation',
        timestamp: currentDate.toISOString(),
        billing_cycle: `${frequency} ${frequency_type}`,
        product_details: {
          id: subscriptionItem.id,
          name: subscriptionItem.name,
          image: subscriptionItem.image,
          category: subscriptionItem.category || 'pet-food'
        }
      },
      customer_data: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: testUser.email,
        phone: customerInfo.phone,
        address: shippingAddress
      },
      cart_items: [{
        product_id: subscriptionItem.id,
        product_name: subscriptionItem.name,
        quantity: subscriptionItem.quantity,
        price: subscriptionItem.price,
        size: subscriptionItem.size,
        isSubscription: subscriptionItem.isSubscription,
        subscriptionType: subscriptionItem.subscriptionType
      }]
    };
    
    console.log('\n💾 Guardando registro en unified_subscriptions...');
    console.log('Datos a insertar:', JSON.stringify(subscriptionData, null, 2));
    
    // Paso 6: Ejecutar el upsert exacto como en el código
    const { data: insertedData, error: subscriptionError } = await supabase
      .from('unified_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id,external_reference',
        ignoreDuplicates: false
      })
      .select();
    
    if (subscriptionError) {
      console.error('❌ Error al guardar suscripción:', subscriptionError);
      throw subscriptionError;
    }
    
    console.log('✅ Registro guardado exitosamente:');
    console.log('ID del registro:', insertedData?.[0]?.id);
    console.log('External Reference:', insertedData?.[0]?.external_reference);
    console.log('Status:', insertedData?.[0]?.status);
    
    // Paso 7: Simular la URL de MercadoPago que se generaría
    const subscriptionLink = 'https://www.mercadopago.com.mx/subscriptions/checkout';
    const finalLink = `${subscriptionLink}?external_reference=${externalReference}&back_url=${encodeURIComponent('https://petgourmet.mx/suscripcion')}`;
    
    console.log('\n🔗 URL de redirección a MercadoPago:');
    console.log(finalLink);
    
    return {
      success: true,
      externalReference,
      subscriptionId: insertedData?.[0]?.id,
      redirectUrl: finalLink,
      subscriptionData: insertedData?.[0]
    };
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

// Ejecutar la simulación
if (require.main === module) {
  simulateCheckoutFlow()
    .then(result => {
      console.log('\n🏁 Resultado de la simulación:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { simulateCheckoutFlow };