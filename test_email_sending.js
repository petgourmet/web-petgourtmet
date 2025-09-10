const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailSending() {
  console.log('🧪 Probando envío de correos de agradecimiento...');
  
  try {
    // Buscar la suscripción activa #44 para obtener datos del usuario
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        users!inner(*),
        products!inner(*)
      `)
      .eq('id', 44)
      .eq('status', 'active')
      .single();

    if (subError) {
      console.error('❌ Error al obtener suscripción:', subError);
      return;
    }

    if (!subscription) {
      console.log('❌ No se encontró la suscripción #44');
      return;
    }

    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      user_email: subscription.users.email,
      user_name: subscription.users.full_name,
      product_name: subscription.products.name,
      status: subscription.status
    });

    // Verificar si ya se envió un correo para esta suscripción
    const { data: existingEmail, error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', subscription.user_id)
      .eq('email_type', 'subscription_thank_you')
      .eq('subscription_id', subscription.id);

    if (emailError) {
      console.error('❌ Error al verificar logs de email:', emailError);
    } else {
      console.log(`📧 Correos existentes para esta suscripción: ${existingEmail?.length || 0}`);
      if (existingEmail && existingEmail.length > 0) {
        console.log('📧 Último correo enviado:', existingEmail[existingEmail.length - 1].created_at);
      }
    }

    // Probar el endpoint de envío de correo
    console.log('\n🚀 Probando endpoint de envío de correo...');
    
    const emailPayload = {
      userId: subscription.user_id,
      subscriptionId: subscription.id,
      userEmail: subscription.users.email,
      userName: subscription.users.full_name || 'Usuario',
      productName: subscription.products.name,
      subscriptionType: subscription.subscription_type,
      amount: subscription.amount,
      frequency: subscription.frequency
    };

    console.log('📤 Datos del correo:', emailPayload);

    // Usar fetch nativo de Node.js (disponible desde v18)
    try {
      const response = await fetch('http://localhost:3000/api/subscriptions/send-thank-you-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      const result = await response.json();
      console.log('📧 Respuesta del endpoint:', result);
      
      if (response.ok) {
        console.log('✅ Correo enviado exitosamente');
      } else {
        console.log('❌ Error al enviar correo:', result.error);
      }
    } catch (fetchError) {
      console.log('❌ Error de conexión al endpoint:', fetchError.message);
      console.log('💡 Asegúrate de que el servidor esté corriendo en http://localhost:3000');
    }

    console.log('\n✅ Prueba de correo completada (envío simulado)');
    console.log('💡 Para envío real, descomenta las líneas del fetch en el script');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testEmailSending().then(() => {
  console.log('\n🏁 Prueba de envío de correos finalizada');
}).catch(console.error);