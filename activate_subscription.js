const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para calcular la próxima fecha de facturación
function calculateNextBillingDate(subscriptionType) {
  const now = new Date();
  let nextBillingDate = new Date(now);

  switch (subscriptionType) {
    case 'weekly':
      nextBillingDate.setDate(now.getDate() + 7);
      break;
    case 'biweekly':
      nextBillingDate.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      nextBillingDate.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      nextBillingDate.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      nextBillingDate.setFullYear(now.getFullYear() + 1);
      break;
    default:
      nextBillingDate.setMonth(now.getMonth() + 1); // Default to monthly
  }

  return nextBillingDate.toISOString();
}

async function activateSubscription() {
  try {
    const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
    
    console.log('🔄 Activando suscripción con external_reference:', externalReference);
    
    // Primero obtener la suscripción actual
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (fetchError) {
      console.error('❌ Error al obtener la suscripción:', fetchError);
      return;
    }

    if (!subscription) {
      console.error('❌ No se encontró la suscripción');
      return;
    }

    console.log('📋 Suscripción encontrada:', {
      id: subscription.id,
      user_id: subscription.user_id,
      status: subscription.status,
      subscription_type: subscription.subscription_type
    });

    // Calcular la próxima fecha de facturación
    const nextBillingDate = calculateNextBillingDate(subscription.subscription_type || 'monthly');
    
    // Actualizar la suscripción a estado 'active'
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        next_billing_date: nextBillingDate,
        updated_at: new Date().toISOString()
      })
      .eq('external_reference', externalReference)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al actualizar la suscripción:', updateError);
      return;
    }

    console.log('✅ Suscripción activada exitosamente:');
    console.log(JSON.stringify(updatedSubscription, null, 2));

    // Actualizar el perfil del usuario
    console.log('🔄 Actualizando perfil del usuario...');
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.user_id)
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error al actualizar el perfil:', profileError);
    } else {
      console.log('✅ Perfil actualizado exitosamente');
    }

    console.log('\n🎉 ¡Proceso completado! La suscripción ha sido activada.');
    console.log('📧 Ahora se debe enviar el correo de confirmación.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

activateSubscription();