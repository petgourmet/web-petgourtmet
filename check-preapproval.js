const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const preapprovalId = '6e27447e6c484da19f7742c18bfee469';

async function checkPreapprovalId() {
  console.log(`🔍 Buscando preapproval_id: ${preapprovalId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Buscar en pending_subscriptions por mercadopago_subscription_id
    console.log('\n📋 Buscando en pending_subscriptions...');
    const { data: pendingByMpId, error: pendingMpError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', preapprovalId);

    if (pendingMpError) {
      console.error('❌ Error buscando en pending_subscriptions por MP ID:', pendingMpError);
    } else if (pendingByMpId && pendingByMpId.length > 0) {
      console.log('✅ Encontrado en pending_subscriptions (por MP ID):');
      console.log(JSON.stringify(pendingByMpId, null, 2));
    } else {
      console.log('❌ No encontrado en pending_subscriptions por MP ID');
    }

    // 2. Buscar en pending_subscriptions por external_reference
    console.log('\n📋 Buscando en pending_subscriptions por external_reference...');
    const { data: pendingByRef, error: pendingRefError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('external_reference', preapprovalId);

    if (pendingRefError) {
      console.error('❌ Error buscando en pending_subscriptions por external_reference:', pendingRefError);
    } else if (pendingByRef && pendingByRef.length > 0) {
      console.log('✅ Encontrado en pending_subscriptions (por external_reference):');
      console.log(JSON.stringify(pendingByRef, null, 2));
    } else {
      console.log('❌ No encontrado en pending_subscriptions por external_reference');
    }

    // 3. Buscar en user_subscriptions por mercadopago_subscription_id
    console.log('\n📋 Buscando en user_subscriptions...');
    const { data: activeByMpId, error: activeMpError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', preapprovalId);

    if (activeMpError) {
      console.error('❌ Error buscando en user_subscriptions:', activeMpError);
    } else if (activeByMpId && activeByMpId.length > 0) {
      console.log('✅ Encontrado en user_subscriptions:');
      console.log(JSON.stringify(activeByMpId, null, 2));
    } else {
      console.log('❌ No encontrado en user_subscriptions');
    }

    // 4. Buscar en user_subscriptions por external_reference
    console.log('\n📋 Buscando en user_subscriptions por external_reference...');
    const { data: activeByRef, error: activeRefError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('external_reference', preapprovalId);

    if (activeRefError) {
      console.error('❌ Error buscando en user_subscriptions por external_reference:', activeRefError);
    } else if (activeByRef && activeByRef.length > 0) {
      console.log('✅ Encontrado en user_subscriptions (por external_reference):');
      console.log(JSON.stringify(activeByRef, null, 2));
    } else {
      console.log('❌ No encontrado en user_subscriptions por external_reference');
    }

    // 5. Buscar en billing_history
    console.log('\n📋 Buscando en billing_history...');
    const { data: billingData, error: billingError } = await supabase
      .from('billing_history')
      .select('*')
      .or(`mercadopago_payment_id.eq.${preapprovalId},external_reference.eq.${preapprovalId}`);

    if (billingError) {
      console.error('❌ Error buscando en billing_history:', billingError);
    } else if (billingData && billingData.length > 0) {
      console.log('✅ Encontrado en billing_history:');
      console.log(JSON.stringify(billingData, null, 2));
    } else {
      console.log('❌ No encontrado en billing_history');
    }

    // 6. Buscar cualquier referencia al ID en todas las tablas
    console.log('\n🔍 Búsqueda general del ID...');
    const tables = ['pending_subscriptions', 'user_subscriptions', 'billing_history', 'profiles'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .textSearch('fts', preapprovalId);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Encontrado en ${table} (búsqueda de texto):`);
          console.log(JSON.stringify(data, null, 2));
        }
      } catch (e) {
        // Ignorar errores de búsqueda de texto si la tabla no tiene FTS
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Búsqueda completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkPreapprovalId();