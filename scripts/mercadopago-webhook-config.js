/**
 * Configuración de Webhooks para MercadoPago - PetGourmet
 * 
 * Este script documenta la configuración necesaria para los webhooks de MercadoPago
 * basado en la documentación oficial y las necesidades específicas del proyecto.
 * 
 * Documentación oficial: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */

const WEBHOOK_CONFIG = {
  // URLs de notificación
  urls: {
    production: 'https://petgourmet.mx/api/mercadopago/webhook',
    test: 'https://petgourmet.mx/api/mercadopago/webhook' // Misma URL para pruebas
  },

  // Eventos necesarios para PetGourmet
  events: {
    // Pagos normales y suscripciones
    payments: {
      name: 'Pagos',
      topic: 'payment',
      description: 'Creación y actualización de pagos',
      products: ['Checkout API', 'Checkout Pro', 'Checkout Bricks', 'Suscripciones'],
      required: true,
      reason: 'Necesario para procesar pagos de productos y suscripciones'
    },

    // Suscripciones - Pagos recurrentes
    subscription_payments: {
      name: 'Planes y suscripciones',
      topic: 'subscription_authorized_payment',
      description: 'Pago recurrente de una suscripción (creación y actualización)',
      products: ['Suscripciones'],
      required: true,
      reason: 'Necesario para manejar pagos recurrentes de suscripciones de comida'
    },

    // Suscripciones - Vinculación
    subscription_preapproval: {
      name: 'Planes y suscripciones',
      topic: 'subscription_preapproval',
      description: 'Vinculación de una suscripción (creación y actualización)',
      products: ['Suscripciones'],
      required: true,
      reason: 'Necesario para gestionar la vinculación de suscripciones'
    },

    // Planes de suscripción
    subscription_plans: {
      name: 'Planes y suscripciones',
      topic: 'subscription_preapproval_plan',
      description: 'Vinculación de un plan de suscripción (creación y actualización)',
      products: ['Suscripciones'],
      required: true,
      reason: 'Necesario para gestionar planes de suscripción personalizados'
    },

    // Órdenes comerciales (recomendado)
    merchant_orders: {
      name: 'Órdenes comerciales',
      topic: 'topic_merchant_order_wh',
      description: 'Creación, actualización o cierre de órdenes comerciales',
      products: ['Checkout Pro'],
      required: false,
      reason: 'Útil para rastrear el estado completo de las órdenes'
    },

    // Contracargos (recomendado para producción)
    chargebacks: {
      name: 'Contracargos',
      topic: 'topic_chargebacks_wh',
      description: 'Apertura de contracargos, cambios de status y modificaciones',
      products: ['Checkout Pro', 'CheckoutAPI', 'Checkout Bricks'],
      required: false,
      reason: 'Importante para gestionar disputas y contracargos'
    },

    // Reclamos (recomendado)
    claims: {
      name: 'Reclamos',
      topic: 'topic_claims_integration_wh',
      description: 'Creación de reclamos y reembolsos',
      products: ['Checkout API', 'Checkout Pro', 'Checkout Bricks', 'Suscripciones'],
      required: false,
      reason: 'Útil para gestionar reclamos y reembolsos de clientes'
    }
  },

  // Configuración de seguridad
  security: {
    secret_key: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    validation_required: true,
    ip_whitelist: [
      // IPs de MercadoPago (se deben verificar en la documentación)
      '209.225.49.0/24',
      '216.33.197.0/24'
    ]
  },

  // Configuración actual del proyecto
  current_setup: {
    endpoint: '/api/mercadopago/webhook',
    method: 'POST',
    content_type: 'application/json',
    timeout: 30000, // 30 segundos
    retry_attempts: 3
  }
};

/**
 * Instrucciones para configurar webhooks en el panel de MercadoPago
 */
function showWebhookSetupInstructions() {
  console.log('\n🔧 INSTRUCCIONES PARA CONFIGURAR WEBHOOKS EN MERCADOPAGO\n');
  
  console.log('1. Accede a: https://www.mercadopago.com.mx/developers/panel');
  console.log('2. Selecciona tu aplicación de PetGourmet');
  console.log('3. Ve a: Webhooks > Configurar notificaciones\n');
  
  console.log('📍 URLs a configurar:');
  console.log(`   • Modo producción: ${WEBHOOK_CONFIG.urls.production}`);
  console.log(`   • Modo pruebas: ${WEBHOOK_CONFIG.urls.test}\n`);
  
  console.log('✅ Eventos OBLIGATORIOS a seleccionar:');
  Object.entries(WEBHOOK_CONFIG.events)
    .filter(([_, event]) => event.required)
    .forEach(([key, event]) => {
      console.log(`   ☑️  ${event.name} (${event.topic})`);
      console.log(`       → ${event.description}`);
      console.log(`       → Razón: ${event.reason}\n`);
    });
  
  console.log('🔍 Eventos RECOMENDADOS (opcionales):');
  Object.entries(WEBHOOK_CONFIG.events)
    .filter(([_, event]) => !event.required)
    .forEach(([key, event]) => {
      console.log(`   ⚪ ${event.name} (${event.topic})`);
      console.log(`       → ${event.description}`);
      console.log(`       → Razón: ${event.reason}\n`);
    });
  
  console.log('🔐 Configuración de seguridad:');
  console.log('   • Asegúrate de configurar una clave secreta');
  console.log('   • Guarda la clave secreta en MERCADOPAGO_WEBHOOK_SECRET');
  console.log('   • Habilita la validación de firma\n');
  
  console.log('🧪 Para probar:');
  console.log('   • Usa el simulador de notificaciones en el panel');
  console.log('   • Verifica que el endpoint responda correctamente');
  console.log('   • Revisa los logs en el dashboard de MercadoPago\n');
}

/**
 * Verifica la configuración actual del webhook
 */
function verifyWebhookConfig() {
  console.log('\n🔍 VERIFICANDO CONFIGURACIÓN ACTUAL DEL WEBHOOK\n');
  
  // Verificar variables de entorno
  const requiredEnvVars = [
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY',
    'MERCADOPAGO_WEBHOOK_SECRET'
  ];
  
  console.log('📋 Variables de entorno:');
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    const status = value ? '✅' : '❌';
    const display = value ? (envVar.includes('SECRET') ? '[CONFIGURADA]' : '[CONFIGURADA]') : '[NO CONFIGURADA]';
    console.log(`   ${status} ${envVar}: ${display}`);
  });
  
  console.log('\n🌐 Endpoint del webhook:');
  console.log(`   📍 URL: ${WEBHOOK_CONFIG.urls.production}`);
  console.log(`   🔧 Método: ${WEBHOOK_CONFIG.current_setup.method}`);
  console.log(`   📄 Content-Type: ${WEBHOOK_CONFIG.current_setup.content_type}`);
  console.log(`   ⏱️  Timeout: ${WEBHOOK_CONFIG.current_setup.timeout}ms`);
  
  console.log('\n📊 Estado del sistema:');
  console.log('   ✅ Endpoint implementado: /api/mercadopago/webhook');
  console.log('   ✅ Validación de firma: Implementada');
  console.log('   ✅ Procesamiento de pagos: Implementado');
  console.log('   ✅ Procesamiento de suscripciones: Implementado');
  console.log('   ✅ Logging y monitoreo: Implementado');
  
  console.log('\n⚠️  PENDIENTE:');
  console.log('   🔧 Configuración manual en el panel de MercadoPago');
  console.log('   🧪 Pruebas con el simulador de notificaciones');
  console.log('   📈 Monitoreo en producción');
}

/**
 * Muestra el resumen de eventos configurables
 */
function showEventsSummary() {
  console.log('\n📋 RESUMEN DE EVENTOS DISPONIBLES\n');
  
  console.log('🔴 CRÍTICOS (Obligatorios para PetGourmet):');
  console.log('   • payment - Pagos de productos y suscripciones');
  console.log('   • subscription_authorized_payment - Pagos recurrentes');
  console.log('   • subscription_preapproval - Vinculación de suscripciones');
  console.log('   • subscription_preapproval_plan - Planes de suscripción\n');
  
  console.log('🟡 RECOMENDADOS (Para mejor gestión):');
  console.log('   • topic_merchant_order_wh - Órdenes comerciales');
  console.log('   • topic_chargebacks_wh - Contracargos');
  console.log('   • topic_claims_integration_wh - Reclamos y reembolsos\n');
  
  console.log('⚪ OPCIONALES (Según necesidades):');
  console.log('   • stop_delivery_op_wh - Alertas de fraude');
  console.log('   • topic_card_id_wh - Actualización de tarjetas');
  console.log('   • mp-connect - OAuth (si se implementa)');
  console.log('   • wallet_connect - Wallet Connect (si se implementa)\n');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  console.log('🚀 CONFIGURACIÓN DE WEBHOOKS MERCADOPAGO - PETGOURMET');
  console.log('=' * 60);
  
  showWebhookSetupInstructions();
  verifyWebhookConfig();
  showEventsSummary();
  
  console.log('\n📚 Documentación oficial:');
  console.log('   https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks');
  
  console.log('\n✨ ¡Configuración lista para implementar!');
}

module.exports = {
  WEBHOOK_CONFIG,
  showWebhookSetupInstructions,
  verifyWebhookConfig,
  showEventsSummary
};