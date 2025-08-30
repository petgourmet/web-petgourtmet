const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

// Crear cliente de Supabase con service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUserSubscriptions() {
  const userEmail = 'cristoferscalante@gmail.com';
  
  console.log('=== BÚSQUEDA DE SUSCRIPCIONES PARA:', userEmail, '===\n');
  
  try {
    // 1. Buscar usuario en la tabla profiles
    console.log('1. Buscando usuario en tabla "profiles"...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail);
    
    if (profilesError) {
      console.error('Error al buscar en profiles:', profilesError);
      return;
    }
    
    console.log('Perfiles encontrados:', profiles.length);
    if (profiles.length === 0) {
      console.log('No se encontró el usuario con email:', userEmail);
      return;
    }
    
    const userProfile = profiles[0];
    console.log('Datos del perfil:', JSON.stringify(userProfile, null, 2));
    const userId = userProfile.id;
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Buscar suscripciones activas en user_subscriptions
    console.log('2. Buscando suscripciones en tabla "user_subscriptions"...');
    const { data: userSubscriptions, error: userSubsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (userSubsError) {
      console.error('Error al buscar en user_subscriptions:', userSubsError);
    } else {
      console.log('Suscripciones activas encontradas:', userSubscriptions.length);
      if (userSubscriptions.length > 0) {
        userSubscriptions.forEach((sub, index) => {
          console.log(`\nSuscripción ${index + 1}:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Buscar suscripciones pendientes
    console.log('3. Buscando suscripciones en tabla "pending_subscriptions"...');
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (pendingError) {
      console.error('Error al buscar en pending_subscriptions:', pendingError);
    } else {
      console.log('Suscripciones pendientes encontradas:', pendingSubscriptions.length);
      if (pendingSubscriptions.length > 0) {
        pendingSubscriptions.forEach((sub, index) => {
          console.log(`\nSuscripción pendiente ${index + 1}:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Buscar en subscription_payments relacionados con las suscripciones del usuario
    console.log('4. Buscando pagos en tabla "subscription_payments"...');
    if (userSubscriptions && userSubscriptions.length > 0) {
      const subscriptionIds = userSubscriptions.map(sub => sub.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('subscription_payments')
        .select('*')
        .in('subscription_id', subscriptionIds);
      
      if (paymentsError) {
        console.error('Error al buscar en subscription_payments:', paymentsError);
      } else {
        console.log('Pagos de suscripción encontrados:', payments.length);
        if (payments.length > 0) {
          payments.forEach((payment, index) => {
            console.log(`\nPago ${index + 1}:`);
            console.log(JSON.stringify(payment, null, 2));
          });
        }
      }
    } else {
      console.log('No hay suscripciones activas, no se pueden buscar pagos.');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Buscar webhooks relacionados con MercadoPago
    console.log('5. Buscando webhooks en tabla "mercadopago_webhooks"...');
    const { data: webhooks, error: webhooksError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (webhooksError) {
      console.error('Error al buscar en mercadopago_webhooks:', webhooksError);
    } else {
      console.log('Últimos 10 webhooks encontrados:', webhooks.length);
      if (webhooks.length > 0) {
        webhooks.forEach((webhook, index) => {
          console.log(`\nWebhook ${index + 1}:`);
          console.log(JSON.stringify(webhook, null, 2));
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 6. Buscar el preapproval_id específico mencionado por el usuario
    const preapprovalId = '6e27447e6c484da19f7742c18bfee469';
    console.log('6. Buscando preapproval_id específico:', preapprovalId);
    
    // Buscar en user_subscriptions por mercadopago_subscription_id
    const { data: subsByMpId, error: subsByMpIdError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', preapprovalId);
    
    if (subsByMpIdError) {
      console.error('Error al buscar por mercadopago_subscription_id:', subsByMpIdError);
    } else {
      console.log('Suscripciones activas con ese preapproval_id:', subsByMpId.length);
      if (subsByMpId.length > 0) {
        subsByMpId.forEach((sub, index) => {
          console.log(`\nSuscripción activa ${index + 1} con preapproval_id:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    // Buscar en pending_subscriptions por mercadopago_subscription_id
    const { data: pendingByMpId, error: pendingByMpIdError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', preapprovalId);
    
    if (pendingByMpIdError) {
      console.error('Error al buscar pendientes por mercadopago_subscription_id:', pendingByMpIdError);
    } else {
      console.log('Suscripciones pendientes con ese preapproval_id:', pendingByMpId.length);
      if (pendingByMpId.length > 0) {
        pendingByMpId.forEach((sub, index) => {
          console.log(`\nSuscripción pendiente ${index + 1} con preapproval_id:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    // Buscar en external_reference que contenga el preapproval_id
    const { data: subsByExtRef, error: subsByExtRefError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .ilike('external_reference', `%${preapprovalId}%`);
    
    if (subsByExtRefError) {
      console.error('Error al buscar por external_reference:', subsByExtRefError);
    } else {
      console.log('Suscripciones activas con preapproval_id en external_reference:', subsByExtRef.length);
      if (subsByExtRef.length > 0) {
        subsByExtRef.forEach((sub, index) => {
          console.log(`\nSuscripción activa ${index + 1} con preapproval_id en external_reference:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    const { data: pendingByExtRef, error: pendingByExtRefError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .ilike('external_reference', `%${preapprovalId}%`);
    
    if (pendingByExtRefError) {
      console.error('Error al buscar pendientes por external_reference:', pendingByExtRefError);
    } else {
      console.log('Suscripciones pendientes con preapproval_id en external_reference:', pendingByExtRef.length);
      if (pendingByExtRef.length > 0) {
        pendingByExtRef.forEach((sub, index) => {
          console.log(`\nSuscripción pendiente ${index + 1} con preapproval_id en external_reference:`);
          console.log(JSON.stringify(sub, null, 2));
        });
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('RESUMEN DE LA BÚSQUEDA COMPLETADA');
    console.log('='.repeat(70));
    console.log('- Usuario encontrado:', userProfile.email);
    console.log('- Suscripciones activas:', userSubscriptions ? userSubscriptions.length : 0);
    console.log('- Suscripciones pendientes:', pendingSubscriptions ? pendingSubscriptions.length : 0);
    console.log('- Webhooks registrados: 0');
    console.log('- Preapproval ID buscado:', preapprovalId);
    console.log('- Encontrado en suscripciones activas:', (subsByMpId?.length || 0) + (subsByExtRef?.length || 0));
    console.log('- Encontrado en suscripciones pendientes:', (pendingByMpId?.length || 0) + (pendingByExtRef?.length || 0));
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar la función
checkUserSubscriptions();