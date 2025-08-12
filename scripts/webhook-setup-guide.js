/**
 * Guía paso a paso para configurar Webhooks de MercadoPago
 * Proyecto: PetGourmet
 * 
 * Esta guía te ayudará a configurar correctamente los webhooks en el panel de MercadoPago
 * siguiendo la documentación oficial y las mejores prácticas.
 */

// const chalk = require('chalk'); // No disponible, usaremos formato simple

// Configuración específica para PetGourmet
const PETGOURMET_CONFIG = {
  domain: 'https://petgourmet.mx',
  webhook_endpoint: '/api/mercadopago/webhook',
  full_webhook_url: 'https://petgourmet.mx/api/mercadopago/webhook',
  
  // Eventos críticos para el negocio
  critical_events: [
    {
      name: 'Pagos',
      topic: 'payment',
      description: 'Pagos de productos individuales y suscripciones',
      business_impact: 'CRÍTICO - Sin esto no se procesan pagos'
    },
    {
      name: 'Planes y suscripciones',
      topic: 'subscription_authorized_payment',
      description: 'Pagos recurrentes de suscripciones',
      business_impact: 'CRÍTICO - Sin esto no funcionan las suscripciones'
    },
    {
      name: 'Planes y suscripciones',
      topic: 'subscription_preapproval',
      description: 'Vinculación de suscripciones',
      business_impact: 'CRÍTICO - Para gestionar suscripciones'
    },
    {
      name: 'Planes y suscripciones',
      topic: 'subscription_preapproval_plan',
      description: 'Planes de suscripción personalizados',
      business_impact: 'CRÍTICO - Para planes personalizados'
    }
  ],
  
  // Eventos recomendados
  recommended_events: [
    {
      name: 'Órdenes comerciales',
      topic: 'topic_merchant_order_wh',
      description: 'Estado completo de órdenes',
      business_impact: 'RECOMENDADO - Mejor seguimiento de órdenes'
    },
    {
      name: 'Contracargos',
      topic: 'topic_chargebacks_wh',
      description: 'Gestión de disputas',
      business_impact: 'RECOMENDADO - Protección contra fraudes'
    },
    {
      name: 'Reclamos',
      topic: 'topic_claims_integration_wh',
      description: 'Reclamos y reembolsos',
      business_impact: 'RECOMENDADO - Mejor atención al cliente'
    }
  ]
};

/**
 * Muestra la guía paso a paso
 */
function showStepByStepGuide() {
  console.log('\n🚀 GUÍA PASO A PASO: CONFIGURACIÓN DE WEBHOOKS MERCADOPAGO');
  console.log('======================================================================');
  
  // Paso 1: Acceso al panel
  console.log('\n📋 PASO 1: Acceder al Panel de Desarrolladores');
  console.log('1. Ve a: https://www.mercadopago.com.mx/developers/panel');
  console.log('2. Inicia sesión con tu cuenta de MercadoPago');
  console.log('3. Busca y selecciona la aplicación de "PetGourmet"');
  console.log('   (Si no existe, créala primero desde "Crear aplicación")');
  
  // Paso 2: Navegación a webhooks
  console.log('\n🔧 PASO 2: Configurar Webhooks');
  console.log('1. En el menú lateral izquierdo, busca "Webhooks"');
  console.log('2. Haz clic en "Configurar notificaciones"');
  console.log('3. Verás dos secciones: "Modo de prueba" y "Modo productivo"');
  
  // Paso 3: URLs
  console.log('\n🌐 PASO 3: Configurar URLs');
  console.log('URL para MODO PRODUCTIVO (IMPORTANTE):');
  console.log(`>>> ${PETGOURMET_CONFIG.full_webhook_url} <<<`);
  console.log('\nURL para MODO DE PRUEBA:');
  console.log(`>>> ${PETGOURMET_CONFIG.full_webhook_url} <<<`);
  console.log('\n💡 Tip: Usamos la misma URL para ambos modos');
  
  // Paso 4: Eventos críticos
  console.log('\n✅ PASO 4: Seleccionar Eventos CRÍTICOS');
  console.log('⚠️  ESTOS EVENTOS SON OBLIGATORIOS:');
  
  PETGOURMET_CONFIG.critical_events.forEach((event, index) => {
    console.log(`\n${index + 1}. ☑️  ${event.name}`);
    console.log(`   Tópico: ${event.topic}`);
    console.log(`   Descripción: ${event.description}`);
    console.log(`   Impacto: ${event.business_impact}`);
  });
  
  // Paso 5: Eventos recomendados
  console.log('\n🔍 PASO 5: Eventos RECOMENDADOS (Opcionales)');
  console.log('Estos eventos mejoran la funcionalidad:');
  
  PETGOURMET_CONFIG.recommended_events.forEach((event, index) => {
    console.log(`\n${index + 1}. ⚪ ${event.name}`);
    console.log(`   Tópico: ${event.topic}`);
    console.log(`   Descripción: ${event.description}`);
    console.log(`   Beneficio: ${event.business_impact}`);
  });
  
  // Paso 6: Clave secreta
  console.log('\n🔐 PASO 6: Configurar Clave Secreta');
  console.log('1. En la sección de webhooks, busca "Clave secreta"');
  console.log('2. Genera una nueva clave secreta (o usa una existente)');
  console.log('3. COPIA esta clave secreta');
  console.log('4. IMPORTANTE: Guarda esta clave en tu archivo .env:');
  console.log('>>> MERCADOPAGO_WEBHOOK_SECRET=tu_clave_secreta_aqui <<<');
  
  // Paso 7: Guardar configuración
  console.log('\n💾 PASO 7: Guardar Configuración');
  console.log('1. Revisa que todas las URLs estén correctas');
  console.log('2. Verifica que todos los eventos críticos estén seleccionados');
  console.log('3. Haz clic en "Guardar configuración"');
  console.log('4. Confirma que aparezca un mensaje de éxito');
  
  // Paso 8: Pruebas
  console.log('\n🧪 PASO 8: Probar la Configuración');
  console.log('1. En la misma página, busca "Simular notificación"');
  console.log('2. Selecciona el evento "payment"');
  console.log('3. Haz clic en "Enviar notificación de prueba"');
  console.log('4. Verifica que el webhook responda correctamente');
  console.log('5. Si todo está bien, verás un estado "200 OK"');
}

/**
 * Muestra la checklist de verificación
 */
function showVerificationChecklist() {
  console.log('\n📋 CHECKLIST DE VERIFICACIÓN');
  console.log('========================================');
  
  const checklist = [
    '✅ Aplicación creada en el panel de MercadoPago',
    '✅ URL de webhook configurada para producción',
    '✅ URL de webhook configurada para pruebas',
    '✅ Evento "Pagos" seleccionado',
    '✅ Evento "subscription_authorized_payment" seleccionado',
    '✅ Evento "subscription_preapproval" seleccionado',
    '✅ Evento "subscription_preapproval_plan" seleccionado',
    '✅ Clave secreta generada y guardada',
    '✅ Variable MERCADOPAGO_WEBHOOK_SECRET configurada',
    '✅ Configuración guardada exitosamente',
    '✅ Notificación de prueba enviada y recibida',
    '✅ Webhook responde con código 200'
  ];
  
  checklist.forEach(item => {
    console.log(`   ${item}`);
  });
  
  console.log('\n🎉 Si todos los puntos están marcados, ¡la configuración está completa!');
}

/**
 * Muestra información de troubleshooting
 */
function showTroubleshooting() {
  console.log('\n🚨 SOLUCIÓN DE PROBLEMAS COMUNES');
  console.log('=============================================');
  
  const problems = [
    {
      problem: 'Error 404 al probar webhook',
      solution: 'Verifica que la URL sea exactamente: https://petgourmet.mx/api/mercadopago/webhook'
    },
    {
      problem: 'Error 500 en el webhook',
      solution: 'Revisa los logs del servidor y verifica que MERCADOPAGO_WEBHOOK_SECRET esté configurado'
    },
    {
      problem: 'No aparecen los eventos de suscripciones',
      solution: 'Asegúrate de que tu aplicación tenga habilitadas las funcionalidades de suscripciones'
    },
    {
      problem: 'Webhook no recibe notificaciones',
      solution: 'Verifica que el servidor esté accesible desde internet y que no haya firewall bloqueando'
    },
    {
      problem: 'Error de validación de firma',
      solution: 'Confirma que MERCADOPAGO_WEBHOOK_SECRET coincida exactamente con la clave del panel'
    }
  ];
  
  problems.forEach((item, index) => {
    console.log(`\n${index + 1}. Problema: ${item.problem}`);
    console.log(`   Solución: ${item.solution}`);
  });
}

/**
 * Muestra información de contacto y recursos
 */
function showResources() {
  console.log('\n📚 RECURSOS ADICIONALES');
  console.log('==============================');
  
  console.log('\n🔗 Enlaces útiles:');
  console.log('   • Panel de desarrolladores: https://www.mercadopago.com.mx/developers/panel');
  console.log('   • Documentación de webhooks: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks');
  console.log('   • Simulador de notificaciones: (Disponible en el panel)');
  console.log('   • Centro de ayuda: https://www.mercadopago.com.mx/ayuda');
  
  console.log('\n🛠️  Comandos útiles para verificar:');
  console.log('   • node scripts/verify-production-system.js');
  console.log('   • node scripts/test-webhook.js');
  console.log('   • node scripts/mercadopago-webhook-config.js');
}

// Función principal
function main() {
  showStepByStepGuide();
  showVerificationChecklist();
  showTroubleshooting();
  showResources();
  
  console.log('\n🎯 ¡Configuración de webhooks lista para implementar!');
  console.log('\nEjecuta este script cuando necesites recordar los pasos de configuración.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  PETGOURMET_CONFIG,
  showStepByStepGuide,
  showVerificationChecklist,
  showTroubleshooting,
  showResources
};