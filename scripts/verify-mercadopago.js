// Script para verificar la configuración de MercadoPago
const { MercadoPagoConfig } = require('mercadopago');
require('dotenv').config({ path: '.env.local' });

async function verifyMercadoPagoConfig() {
  console.log('🔍 Verificando configuración de MercadoPago...\n');

  // Verificar variables de entorno
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log('📋 Variables de entorno:');
  console.log(`✅ Access Token: ${accessToken ? 'Configurado' : '❌ Faltante'}`);
  console.log(`✅ Public Key: ${publicKey ? 'Configurado' : '❌ Faltante'}`);
  console.log(`✅ App URL: ${appUrl ? 'Configurado' : '❌ Faltante'}`);
  console.log('');

  if (!accessToken) {
    console.log('❌ Error: MERCADOPAGO_ACCESS_TOKEN no está configurado');
    return;
  }

  if (!publicKey) {
    console.log('❌ Error: NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY no está configurado');
    return;
  }

  try {
    // Verificar conexión con MercadoPago
    console.log('🔗 Verificando conexión con MercadoPago...');
    
    const config = new MercadoPagoConfig({ accessToken });
    
    // Hacer una petición de prueba
    const response = await fetch('https://api.mercadopago.com/v1/account/application', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexión exitosa con MercadoPago');
      console.log(`📱 Aplicación: ${data.name || 'Sin nombre'}`);
      console.log(`🆔 ID: ${data.id || 'N/A'}`);
      console.log(`🏪 Modo: ${data.live_mode ? 'Producción' : 'Desarrollo'}`);
    } else {
      console.log('❌ Error en la conexión con MercadoPago');
      console.log(`Status: ${response.status}`);
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        console.log(`Error: ${errorData.message || 'Error desconocido'}`);
      }
    }
  } catch (error) {
    console.log('❌ Error al verificar MercadoPago:', error.message);
  }

  console.log('\n🚀 Configuración de MercadoPago verificada!');
  console.log('💡 Puedes probar el flujo de pago accediendo a: http://localhost:3000');
}

verifyMercadoPagoConfig().catch(console.error);
