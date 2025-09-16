import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Buscando suscripción con external_reference: subscription_PG-717522_1757974717522');

try {
  // Buscar en user_subscriptions
  const { data: userSubs, error: userError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('external_reference', 'subscription_PG-717522_1757974717522');
    
  if (userError) {
    console.error('Error en user_subscriptions:', userError);
  } else {
    console.log('user_subscriptions encontradas:', userSubs?.length || 0);
    if (userSubs?.length > 0) {
      console.log('Datos:', JSON.stringify(userSubs, null, 2));
    }
  }

  // Buscar en pending_subscriptions
  const { data: pendingSubs, error: pendingError } = await supabase
    .from('pending_subscriptions')
    .select('*')
    .eq('external_reference', 'subscription_PG-717522_1757974717522');
    
  if (pendingError) {
    console.error('Error en pending_subscriptions:', pendingError);
  } else {
    console.log('pending_subscriptions encontradas:', pendingSubs?.length || 0);
    if (pendingSubs?.length > 0) {
      console.log('Datos:', JSON.stringify(pendingSubs, null, 2));
    }
  }

  // También buscar por partes de la referencia
  console.log('\n🔍 Buscando por partes de la referencia...');
  
  const { data: userSubsPartial, error: userErrorPartial } = await supabase
    .from('user_subscriptions')
    .select('*')
    .ilike('external_reference', '%PG-717522%');
    
  if (userErrorPartial) {
    console.error('Error en búsqueda parcial user_subscriptions:', userErrorPartial);
  } else {
    console.log('user_subscriptions con PG-717522:', userSubsPartial?.length || 0);
    if (userSubsPartial?.length > 0) {
      console.log('Datos parciales:', JSON.stringify(userSubsPartial, null, 2));
    }
  }

  const { data: pendingSubsPartial, error: pendingErrorPartial } = await supabase
    .from('pending_subscriptions')
    .select('*')
    .ilike('external_reference', '%PG-717522%');
    
  if (pendingErrorPartial) {
    console.error('Error en búsqueda parcial pending_subscriptions:', pendingErrorPartial);
  } else {
    console.log('pending_subscriptions con PG-717522:', pendingSubsPartial?.length || 0);
    if (pendingSubsPartial?.length > 0) {
      console.log('Datos parciales:', JSON.stringify(pendingSubsPartial, null, 2));
    }
  }

  // Buscar todas las suscripciones recientes para ver qué hay
  console.log('\n🔍 Últimas 5 suscripciones en cada tabla...');
  
  const { data: recentUser, error: recentUserError } = await supabase
    .from('user_subscriptions')
    .select('id, external_reference, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentUserError) {
    console.error('Error en suscripciones recientes user_subscriptions:', recentUserError);
  } else {
    console.log('Últimas user_subscriptions:', JSON.stringify(recentUser, null, 2));
  }

  const { data: recentPending, error: recentPendingError } = await supabase
    .from('pending_subscriptions')
    .select('id, external_reference, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentPendingError) {
    console.error('Error en suscripciones recientes pending_subscriptions:', recentPendingError);
  } else {
    console.log('Últimas pending_subscriptions:', JSON.stringify(recentPending, null, 2));
  }

} catch (error) {
  console.error('Error general:', error);
}

console.log('✅ Búsqueda completada');