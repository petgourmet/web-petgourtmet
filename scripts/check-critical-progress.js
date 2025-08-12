#!/usr/bin/env node

/**
 * Script para verificar el progreso de los puntos críticos
 * PetGourmet - Verificador de Estado Crítico
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔍 VERIFICADOR DE PROGRESO - PUNTOS CRÍTICOS');
console.log('='.repeat(60));

function checkPoint1_PanelConfig() {
  console.log('\n🔴 PUNTO CRÍTICO 1: CONFIGURACIÓN PANEL MERCADOPAGO');
  console.log('─'.repeat(50));
  
  console.log('\n❓ PREGUNTAS DE VERIFICACIÓN:');
  console.log('   1. ¿Has accedido al panel de MercadoPago?');
  console.log('      🌐 https://www.mercadopago.com.mx/developers/panel');
  
  console.log('\n   2. ¿Has configurado la URL del webhook?');
  console.log('      🔗 URL: https://petgourmet.mx/api/mercadopago/webhook');
  
  console.log('\n   3. ¿Has seleccionado todos los eventos críticos?');
  console.log('      ✅ Pagos (payment)');
  console.log('      ✅ Suscripciones (subscription_*)');
  console.log('      ✅ Órdenes comerciales (merchant_orders)');
  console.log('      ✅ Contracargos (chargebacks)');
  console.log('      ✅ Reclamos (claims)');
  
  console.log('\n   4. ¿Has activado el modo productivo?');
  console.log('      🟢 Webhook debe estar en "Modo productivo"');
  
  console.log('\n   5. ¿Has copiado la clave secreta generada?');
  console.log('      🔐 Necesaria para el Punto 2');
  
  console.log('\n📊 ESTADO: [ ] PENDIENTE / [ ] COMPLETADO');
}

function checkPoint2_EnvVariable() {
  console.log('\n🔴 PUNTO CRÍTICO 2: VARIABLE DE ENTORNO WEBHOOK SECRET');
  console.log('─'.repeat(50));
  
  // Verificar si existe el archivo .env
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);
  
  console.log('\n🔍 VERIFICACIÓN AUTOMÁTICA:');
  console.log(`   📁 Archivo .env: ${envExists ? '✅ EXISTE' : '❌ NO ENCONTRADO'}`);
  
  if (envExists) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasWebhookSecret = envContent.includes('MERCADOPAGO_WEBHOOK_SECRET');
      console.log(`   🔑 MERCADOPAGO_WEBHOOK_SECRET: ${hasWebhookSecret ? '✅ CONFIGURADA' : '❌ FALTA'}`);
      
      if (hasWebhookSecret) {
        const secretLine = envContent.split('\n').find(line => line.includes('MERCADOPAGO_WEBHOOK_SECRET'));
        const hasValue = secretLine && secretLine.split('=')[1] && secretLine.split('=')[1].trim().length > 10;
        console.log(`   💾 Valor de la clave: ${hasValue ? '✅ CONFIGURADO' : '❌ VACÍO O MUY CORTO'}`);
      }
    } catch (error) {
      console.log('   ⚠️  Error al leer .env:', error.message);
    }
  }
  
  console.log('\n❓ PREGUNTAS DE VERIFICACIÓN:');
  console.log('   1. ¿Has agregado MERCADOPAGO_WEBHOOK_SECRET al .env?');
  console.log('   2. ¿Has usado la clave secreta del Panel MercadoPago?');
  console.log('   3. ¿Has desplegado esta variable en producción?');
  console.log('   4. ¿Has reiniciado el servidor de producción?');
  
  console.log('\n📊 ESTADO: [ ] PENDIENTE / [ ] COMPLETADO');
}

function checkPoint3_ProductionTesting() {
  console.log('\n🔴 PUNTO CRÍTICO 3: PRUEBAS EN PRODUCCIÓN');
  console.log('─'.repeat(50));
  
  console.log('\n❓ PREGUNTAS DE VERIFICACIÓN:');
  console.log('   1. ¿Has probado el webhook desde el panel de MercadoPago?');
  console.log('      🔧 Usar "Simular notificación" en el panel');
  
  console.log('\n   2. ¿El webhook responde con 200 OK?');
  console.log('      ✅ Respuesta exitosa esperada');
  
  console.log('\n   3. ¿Has hecho una transacción real de prueba?');
  console.log('      💳 Compra pequeña en https://petgourmet.mx');
  
  console.log('\n   4. ¿Se procesó el pago automáticamente?');
  console.log('      📊 Verificar en dashboard administrativo');
  
  console.log('\n   5. ¿Los logs muestran actividad del webhook?');
  console.log('      📋 Revisar logs del servidor');
  
  console.log('\n📊 ESTADO: [ ] PENDIENTE / [ ] COMPLETADO');
}

function showNextSteps() {
  console.log('\n' + '='.repeat(50));
  console.log('🎯 PRÓXIMOS PASOS SEGÚN TU PROGRESO');
  console.log('='.repeat(50));
  
  console.log('\n🔄 SI AÚN NO HAS EMPEZADO:');
  console.log('   1️⃣ Ejecuta: node scripts/solve-critical-points.js');
  console.log('   2️⃣ Sigue la guía paso a paso');
  console.log('   3️⃣ Vuelve a ejecutar este script para verificar');
  
  console.log('\n🔄 SI ESTÁS EN PROGRESO:');
  console.log('   ✅ Completa el punto actual antes de continuar');
  console.log('   🔍 Usa este script para verificar cada punto');
  console.log('   📞 Contacta soporte si encuentras problemas');
  
  console.log('\n🔄 SI HAS COMPLETADO TODO:');
  console.log('   🎉 ¡Felicidades! Sistema 100% operativo');
  console.log('   📊 Monitorea el dashboard regularmente');
  console.log('   🔄 Ejecuta: node scripts/webhook-final-summary.js');
}

function showTroubleshootingTips() {
  console.log('\n' + '='.repeat(50));
  console.log('🛠️  SOLUCIÓN DE PROBLEMAS COMUNES');
  console.log('='.repeat(50));
  
  console.log('\n❌ PROBLEMA: Webhook responde con error 500');
  console.log('   🔧 SOLUCIÓN: Verificar variable MERCADOPAGO_WEBHOOK_SECRET');
  console.log('   🔧 SOLUCIÓN: Revisar logs del servidor');
  console.log('   🔧 SOLUCIÓN: Verificar que la URL sea accesible');
  
  console.log('\n❌ PROBLEMA: No se procesan los pagos automáticamente');
  console.log('   🔧 SOLUCIÓN: Verificar eventos seleccionados en el panel');
  console.log('   🔧 SOLUCIÓN: Confirmar que el webhook esté en modo productivo');
  console.log('   🔧 SOLUCIÓN: Revisar logs de la aplicación');
  
  console.log('\n❌ PROBLEMA: Variable de entorno no se encuentra');
  console.log('   🔧 SOLUCIÓN: Verificar archivo .env en la raíz del proyecto');
  console.log('   🔧 SOLUCIÓN: Reiniciar servidor después de agregar variable');
  console.log('   🔧 SOLUCIÓN: Verificar despliegue en producción');
  
  console.log('\n❌ PROBLEMA: Panel MercadoPago no guarda configuración');
  console.log('   🔧 SOLUCIÓN: Verificar permisos de la cuenta');
  console.log('   🔧 SOLUCIÓN: Intentar desde otro navegador');
  console.log('   🔧 SOLUCIÓN: Contactar soporte de MercadoPago');
}

function showUrgentActions() {
  console.log('\n' + '='.repeat(50));
  console.log('🚨 ACCIONES URGENTES RECOMENDADAS');
  console.log('='.repeat(50));
  
  console.log('\n⏰ PRIORIDAD ALTA (HOY):');
  console.log('   🔴 Completar configuración del Panel MercadoPago');
  console.log('   🔴 Agregar variable MERCADOPAGO_WEBHOOK_SECRET');
  console.log('   🔴 Probar webhook con simulación');
  
  console.log('\n⏰ PRIORIDAD MEDIA (ESTA SEMANA):');
  console.log('   🟡 Hacer transacción real de prueba');
  console.log('   🟡 Configurar monitoreo de logs');
  console.log('   🟡 Documentar proceso para el equipo');
  
  console.log('\n⏰ PRIORIDAD BAJA (PRÓXIMAS SEMANAS):');
  console.log('   🟢 Optimizar rendimiento del webhook');
  console.log('   🟢 Configurar alertas automáticas');
  console.log('   🟢 Implementar métricas avanzadas');
}

function main() {
  checkPoint1_PanelConfig();
  checkPoint2_EnvVariable();
  checkPoint3_ProductionTesting();
  showNextSteps();
  showTroubleshootingTips();
  showUrgentActions();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN: VERIFICA CADA PUNTO ANTES DE CONTINUAR');
  console.log('⚡ OBJETIVO: SISTEMA 100% OPERATIVO EN PRODUCCIÓN');
  console.log('='.repeat(60));
  
  console.log('\n🔄 Para volver a verificar tu progreso:');
  console.log('   node scripts/check-critical-progress.js');
  
  console.log('\n📞 ¿Necesitas ayuda? Contacta al equipo de desarrollo.');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkPoint1_PanelConfig,
  checkPoint2_EnvVariable,
  checkPoint3_ProductionTesting,
  showNextSteps,
  showTroubleshootingTips
};