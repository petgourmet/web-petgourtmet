// Test script para verificar MercadoPago API directamente
const fetch = require('node-fetch');

async function testMercadoPagoAPI() {
  try {
    console.log('🔍 Probando MercadoPago API directamente...');
    
    // Obtener token de acceso desde variables de entorno
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('❌ MERCADOPAGO_ACCESS_TOKEN no está configurado');
      return;
    }
    
    const externalReference = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de';
    console.log('🔍 Buscando pagos para external_reference:', externalReference);
    
    // Buscar pagos por external_reference
    const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${externalReference}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status de respuesta:', response.status);
    
    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.statusText);
      const errorText = await response.text();
      console.error('Detalles del error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('📋 Resultados encontrados:', data.results?.length || 0);
    
    if (data.results && data.results.length > 0) {
      console.log('✅ Pagos encontrados:');
      data.results.forEach((payment, index) => {
        console.log(`\n--- Pago ${index + 1} ---`);
        console.log('ID:', payment.id);
        console.log('Status:', payment.status);
        console.log('Amount:', payment.transaction_amount);
        console.log('Currency:', payment.currency_id);
        console.log('Date Created:', payment.date_created);
        console.log('External Reference:', payment.external_reference);
        console.log('Payer Email:', payment.payer?.email);
        console.log('Payment Method:', payment.payment_method_id);
      });
    } else {
      console.log('❌ No se encontraron pagos para esta referencia');
      
      // Intentar buscar suscripciones también
      console.log('\n🔍 Buscando suscripciones...');
      const subResponse = await fetch(`https://api.mercadopago.com/preapproval/search?external_reference=${externalReference}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status de suscripciones:', subResponse.status);
      
      if (subResponse.ok) {
        const subData = await subResponse.json();
        console.log('📋 Suscripciones encontradas:', subData.results?.length || 0);
        
        if (subData.results && subData.results.length > 0) {
          console.log('✅ Suscripciones encontradas:');
          subData.results.forEach((sub, index) => {
            console.log(`\n--- Suscripción ${index + 1} ---`);
            console.log('ID:', sub.id);
            console.log('Status:', sub.status);
            console.log('External Reference:', sub.external_reference);
            console.log('Payer ID:', sub.payer_id);
            console.log('Date Created:', sub.date_created);
            console.log('Next Payment Date:', sub.next_payment_date);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error ejecutando test:', error.message);
  }
}

testMercadoPagoAPI();