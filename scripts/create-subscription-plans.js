const { MercadoPagoConfig, PreApprovalPlan } = require('mercadopago');

// Configuración de MercadoPago con credenciales de sandbox
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-2271891404255560-093016-4e05cc1d735c0e291a75a9109319ddf7-2718057813',
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

const preApprovalPlan = new PreApprovalPlan(client);

// Función para crear un plan de suscripción
async function createSubscriptionPlan(planData) {
  try {
    console.log(`Creando plan: ${planData.reason}`);
    const response = await preApprovalPlan.create({ body: planData });
    console.log(`✅ Plan creado exitosamente:`, {
      id: response.id,
      reason: response.reason,
      frequency: response.auto_recurring.frequency,
      frequency_type: response.auto_recurring.frequency_type,
      transaction_amount: response.auto_recurring.transaction_amount,
      init_point: response.init_point
    });
    return response;
  } catch (error) {
    console.error(`❌ Error creando plan ${planData.reason}:`, error.message);
    if (error.cause) {
      console.error('Detalles del error:', error.cause);
    }
    return null;
  }
}

// Definir los planes de suscripción
const subscriptionPlans = [
  {
    reason: "Suscripción Semanal - Flan de Pollo",
    auto_recurring: {
      frequency: 7, // 7 días para semanal
      frequency_type: "days",
      transaction_amount: 85, // Precio base con 10% descuento
      currency_id: "MXN",
      repetitions: 52, // 1 año de suscripciones semanales
      billing_day_proportional: false
    },
    back_url: "/suscripcion",
    payment_methods_allowed: {
      payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" }
      ]
    }
  },
  {
    reason: "Suscripción Quincenal - Flan de Pollo",
    auto_recurring: {
      frequency: 14, // 14 días para quincenal
      frequency_type: "days",
      transaction_amount: 170, // Precio base * 2 con 12% descuento
      currency_id: "MXN",
      repetitions: 26, // 1 año de suscripciones quincenales
      billing_day_proportional: false
    },
    back_url: "/suscripcion",
    payment_methods_allowed: {
      payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" }
      ]
    }
  },
  {
    reason: "Suscripción Mensual - Flan de Pollo",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 340, // Precio base * 4 con 15% descuento
      currency_id: "MXN",
      repetitions: 12, // 1 año de suscripciones mensuales
      billing_day_proportional: false
    },
    back_url: "/suscripcion",
    payment_methods_allowed: {
      payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" }
      ]
    }
  },
  {
    reason: "Suscripción Trimestral - Flan de Pollo",
    auto_recurring: {
      frequency: 3,
      frequency_type: "months",
      transaction_amount: 960, // Precio base * 12 con 20% descuento
      currency_id: "MXN",
      repetitions: 4, // 1 año de suscripciones trimestrales
      billing_day_proportional: false
    },
    back_url: "/suscripcion",
    payment_methods_allowed: {
      payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" }
      ]
    }
  }
];

// Función principal para crear todos los planes
async function createAllPlans() {
  console.log('🚀 Iniciando creación de planes de suscripción en MercadoPago Sandbox...\n');
  
  const results = [];
  
  for (const plan of subscriptionPlans) {
    const result = await createSubscriptionPlan(plan);
    if (result) {
      results.push({
        type: plan.reason.includes('Semanal') ? 'weekly' : 
              plan.reason.includes('Quincenal') ? 'biweekly' :
              plan.reason.includes('Mensual') ? 'monthly' : 'quarterly',
        id: result.id,
        init_point: result.init_point,
        url: `https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=${result.id}`
      });
    }
    
    // Esperar un poco entre creaciones para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📋 Resumen de planes creados:');
  console.log('=====================================');
  
  results.forEach(plan => {
    console.log(`${plan.type.toUpperCase()}: ${plan.id}`);
    console.log(`URL: ${plan.url}\n`);
  });
  
  console.log('🔧 Variables de entorno sugeridas para .env:');
  console.log('=====================================');
  results.forEach(plan => {
    const envVar = `MERCADOPAGO_SUBSCRIPTION_${plan.type.toUpperCase()}_URL`;
    console.log(`${envVar}=${plan.url}`);
  });
  
  return results;
}

// Ejecutar el script
if (require.main === module) {
  createAllPlans()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { createAllPlans, createSubscriptionPlan };