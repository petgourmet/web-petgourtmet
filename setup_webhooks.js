const mercadoPagoToken = 'APP_USR-1329434229865091-103120-bd57a35fcc4262dcc18064dd52ccaac7-1227980651';
const webhookUrl = 'https://petgourmet.mx/api/mercadopago/webhook';

async function setupWebhooks() {
  console.log('🔧 Configurando webhooks de MercadoPago...');
  
  try {
    // Primero, obtener webhooks existentes
    console.log('\n1️⃣ Obteniendo webhooks existentes...');
    
    const getWebhooksResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    let existingWebhooks = [];
    if (getWebhooksResponse.ok) {
      existingWebhooks = await getWebhooksResponse.json();
      console.log(`✅ Webhooks existentes: ${existingWebhooks.length}`);
      
      // Mostrar webhooks existentes
      existingWebhooks.forEach((wh, index) => {
        console.log(`   ${index + 1}. ID: ${wh.id}`);
        console.log(`      URL: ${wh.url}`);
        console.log(`      Eventos: ${wh.events ? wh.events.join(', ') : 'N/A'}`);
        console.log(`      Estado: ${wh.status || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No se pudieron obtener webhooks existentes:', getWebhooksResponse.status);
    }
    
    // Verificar si ya existe un webhook para Pet Gourmet
    const petgourmetWebhook = existingWebhooks.find(wh => 
      wh.url && wh.url.includes('petgourmet.mx')
    );
    
    if (petgourmetWebhook) {
      console.log('\n⚠️ Ya existe un webhook para Pet Gourmet:');
      console.log(`   ID: ${petgourmetWebhook.id}`);
      console.log(`   URL: ${petgourmetWebhook.url}`);
      console.log(`   Eventos: ${petgourmetWebhook.events ? petgourmetWebhook.events.join(', ') : 'N/A'}`);
      
      // Actualizar el webhook existente
      console.log('\n2️⃣ Actualizando webhook existente...');
      
      const updatePayload = {
        url: webhookUrl,
        events: [
          'payment',
          'subscription_preapproval',
          'subscription_authorized_payment'
        ]
      };
      
      const updateResponse = await fetch(`https://api.mercadopago.com/v1/webhooks/${petgourmetWebhook.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (updateResponse.ok) {
        const updatedWebhook = await updateResponse.json();
        console.log('✅ Webhook actualizado exitosamente');
        console.log(`   ID: ${updatedWebhook.id}`);
        console.log(`   URL: ${updatedWebhook.url}`);
        console.log(`   Eventos: ${updatedWebhook.events.join(', ')}`);
      } else {
        const errorText = await updateResponse.text();
        console.log('❌ Error actualizando webhook:', updateResponse.status);
        console.log('   Error details:', errorText);
      }
    } else {
      // Crear nuevo webhook
      console.log('\n2️⃣ Creando nuevo webhook...');
      
      const createPayload = {
        url: webhookUrl,
        events: [
          'payment',
          'subscription_preapproval',
          'subscription_authorized_payment'
        ]
      };
      
      const createResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      });
      
      if (createResponse.ok) {
        const newWebhook = await createResponse.json();
        console.log('✅ Webhook creado exitosamente');
        console.log(`   ID: ${newWebhook.id}`);
        console.log(`   URL: ${newWebhook.url}`);
        console.log(`   Eventos: ${newWebhook.events.join(', ')}`);
      } else {
        const errorText = await createResponse.text();
        console.log('❌ Error creando webhook:', createResponse.status);
        console.log('   Error details:', errorText);
      }
    }
    
    // Verificar configuración final
    console.log('\n3️⃣ Verificando configuración final...');
    
    const finalCheckResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (finalCheckResponse.ok) {
      const finalWebhooks = await finalCheckResponse.json();
      const activePetgourmetWebhooks = finalWebhooks.filter(wh => 
        wh.url && wh.url.includes('petgourmet.mx')
      );
      
      console.log(`✅ Webhooks activos para Pet Gourmet: ${activePetgourmetWebhooks.length}`);
      
      activePetgourmetWebhooks.forEach((wh, index) => {
        console.log(`   ${index + 1}. ID: ${wh.id}`);
        console.log(`      URL: ${wh.url}`);
        console.log(`      Eventos: ${wh.events ? wh.events.join(', ') : 'N/A'}`);
        console.log(`      Estado: ${wh.status || 'N/A'}`);
      });
    }
    
    console.log('\n📊 Configuración completada');
    console.log('\n🔧 Próximos pasos:');
    console.log('   1. Probar el webhook con una transacción de prueba');
    console.log('   2. Monitorear logs del servidor para verificar recepción');
    console.log('   3. Verificar que las suscripciones se procesen correctamente');
    
  } catch (error) {
    console.error('💥 Error configurando webhooks:', error);
  }
}

// Ejecutar configuración
setupWebhooks();