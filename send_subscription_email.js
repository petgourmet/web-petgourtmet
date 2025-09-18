const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

// Configuración de correo (usando Gmail como ejemplo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tu-email@gmail.com', // Cambiar por el email real
    pass: 'tu-password-app' // Cambiar por la contraseña de aplicación real
  }
});

async function sendSubscriptionConfirmationEmail() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
  
  try {
    console.log('📧 Preparando envío de correo de confirmación...');
    
    // Obtener datos de la suscripción
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();
    
    if (subError) {
      console.error('❌ Error al buscar suscripción:', subError);
      return;
    }
    
    // Obtener datos del usuario por separado
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', subscription.user_id)
      .single();
    
    if (profileError) {
      console.error('❌ Error al buscar perfil del usuario:', profileError);
      return;
    }
    
    console.log('📋 Datos de la suscripción:', {
      id: subscription.id,
      status: subscription.status,
      product_name: subscription.product_name,
      discounted_price: subscription.discounted_price,
      next_billing_date: subscription.next_billing_date
    });
    
    console.log('👤 Datos del usuario:', {
      email: userProfile?.email,
      name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim()
    });
    
    if (!userProfile?.email) {
      console.error('❌ No se encontró email del usuario');
      return;
    }
    
    // Formatear fecha de próximo pago
    const nextBillingDate = new Date(subscription.next_billing_date);
    const formattedDate = nextBillingDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Crear el contenido del correo
    const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Cliente';
    
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>¡Tu suscripción está activa!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .price { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1>¡Tu suscripción está activa!</h1>
            </div>
            <div class="content">
                <h2>¡Hola ${userName}!</h2>
                <p>¡Excelentes noticias! Tu suscripción a <strong>Pet Gourmet</strong> ha sido activada exitosamente.</p>
                
                <div class="details">
                    <h3>Detalles de tu suscripción:</h3>
                    <p><strong>Producto:</strong> ${subscription.product_name}</p>
                    <p><strong>Tipo:</strong> Suscripción ${subscription.subscription_type === 'monthly' ? 'Mensual' : subscription.subscription_type}</p>
                    <p><strong>Precio:</strong> <span class="price">$${subscription.discounted_price} MXN</span></p>
                    <p><strong>Próximo pago:</strong> ${formattedDate}</p>
                    <p><strong>Estado:</strong> <span style="color: #4CAF50; font-weight: bold;">ACTIVA</span></p>
                </div>
                
                <p>Tu mascota recibirá productos frescos y nutritivos de forma regular. Puedes gestionar tu suscripción desde tu perfil en cualquier momento.</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="https://tu-sitio.com/perfil" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi perfil</a>
                </p>
                
                <p>¡Gracias por confiar en Pet Gourmet para el cuidado de tu mascota!</p>
            </div>
            <div class="footer">
                <p>Pet Gourmet - Nutrición premium para tu mascota</p>
                <p>Si tienes alguna pregunta, contáctanos en soporte@petgourmet.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Configurar el correo
    const mailOptions = {
      from: '"Pet Gourmet" <noreply@petgourmet.com>',
      to: userProfile.email,
      subject: '🎉 ¡Tu suscripción Pet Gourmet está activa!',
      html: emailContent
    };
    
    console.log('📤 Enviando correo a:', userProfile.email);
    
    // Simular envío de correo (comentar las siguientes líneas para envío real)
    console.log('📧 SIMULACIÓN DE ENVÍO DE CORREO:');
    console.log('Para:', mailOptions.to);
    console.log('Asunto:', mailOptions.subject);
    console.log('✅ Correo simulado enviado exitosamente');
    
    // Para envío real, descomenta las siguientes líneas:
    /*
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado exitosamente:', info.messageId);
    */
    
    // Registrar el envío en la base de datos (opcional)
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        user_id: subscription.user_id,
        email_type: 'subscription_activated',
        recipient_email: userProfile.email,
        subject: mailOptions.subject,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });
    
    if (logError) {
      console.log('⚠️ No se pudo registrar el log del email (tabla email_logs no existe):', logError.message);
    } else {
      console.log('📝 Log del email registrado');
    }
    
    console.log('🎉 ¡Proceso de correo completado!');
    
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
  }
}

// Ejecutar la función
sendSubscriptionConfirmationEmail();