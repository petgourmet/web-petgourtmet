import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables de entorno faltantes:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubscriptions() {
  try {
    console.log('=== CONSULTANDO SUSCRIPCIONES EN SUPABASE ===');
    
    // Consultar suscripciones con más detalle
    const { data: userSubs, error: userSubsError } = await supabase
      .from('user_subscriptions')
      .select('id, status, cancelled_at, mercadopago_subscription_id, created_at, user_id');
    
    const { data: pendingSubs, error: pendingSubsError } = await supabase
      .from('pending_subscriptions')
      .select('*');
    
    if (userSubsError) {
      console.error('Error fetching user_subscriptions:', userSubsError);
      return;
    }
    
    if (pendingSubsError) {
      console.error('Error fetching pending_subscriptions:', pendingSubsError);
      return;
    }
    
    console.log('\n=== USER SUBSCRIPTIONS DETAILED ===');
    console.log(`Found ${userSubs?.length || 0} subscriptions`);
    userSubs?.forEach(sub => {
      console.log(`\n--- Subscription ${sub.id} ---`);
      console.log(`Status: ${sub.status}`);
      console.log(`Cancelled at: ${sub.cancelled_at || 'null'}`);
      console.log(`MP ID: ${sub.mercadopago_subscription_id}`);
      console.log(`User ID: ${sub.user_id}`);
      console.log(`Created: ${sub.created_at}`);
      
      // Determinar estado según la lógica actual
      let displayStatus = sub.status || 'inactive';
      if (sub.cancelled_at) {
        displayStatus = 'cancelled';
      } else if (sub.status === 'active') {
        displayStatus = 'active';
      }
      console.log(`Display Status (current logic): ${displayStatus}`);
    });
    
    console.log('\n=== PENDING SUBSCRIPTIONS ===');
    console.log(`Found ${pendingSubs?.length || 0} subscriptions`);
    pendingSubs?.forEach(sub => {
      console.log(`- ID: ${sub.id}, Status: ${sub.status}`);
    });
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

checkSubscriptions();