const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para obtener texto de frecuencia
function getFrequencyText(subscriptionType) {
  switch (subscriptionType) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quincenal';
    case 'monthly':
      return 'Mensual';
    case 'quarterly':
      return 'Trimestral';
    case 'yearly':
      return 'Anual';
    default:
      return 'Mensual';
  }
}

async function sendWelcomeEmail() {
  try {
    const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
    
    console.log('📧 Enviando correo de bienvenida para suscripción:', externalReference);
    
    // Obtener la suscripción activada
    const { data: subscription, error: subscriptionError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (subscriptionError) {
      console.error('❌ Error al obtener la suscripción:', subscriptionError);
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
      product_name: subscription.product_name
    });

    // Obtener datos del usuario
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(subscription.user_id);

    if (userError) {
      console.error('❌ Error al obtener el usuario:', userError);
      return;
    }

    if (!user) {
      console.error('❌ No se encontró el usuario');
      return;
    }

    console.log('👤 Usuario encontrado:', {
      id: user.user.id,
      email: user.user.email,
      name: user.user.user_metadata?.full_name || user.user.email
    });

    // Preparar datos para el correo
    const subscriptionDetails = {
      product_name: subscription.product_name || 'Producto Pet Gourmet',
      frequency_text: getFrequencyText(subscription.subscription_type),
      discounted_price: subscription.discounted_price || 0,
      next_billing_date: subscription.next_billing_date
    };

    const emailData = {
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      user_email: user.user.email,
      user_name: user.user.user_metadata?.full_name || user.user.email,
      subscription_details: subscriptionDetails
    };

    console.log('📧 Enviando correo con datos:', emailData);

    // Enviar el correo usando el endpoint
    const response = await fetch('http://localhost:3000/api/subscriptions/send-thank-you-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Correo enviado exitosamente:', result);
    } else {
      console.error('❌ Error al enviar el correo:', result);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

sendWelcomeEmail();