// test-subscription-email-cristofer.js - Prueba simplificada de envío de correo
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

// Configuración SMTP exacta de contact-email-service.ts
function createTransporter() {
  console.log('📧 Creando transporter SMTP...');
  console.log('🔧 Configuración SMTP:');
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   Port:', process.env.SMTP_PORT);
  console.log('   User:', process.env.SMTP_USER);
  console.log('   Secure:', process.env.SMTP_SECURE);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  console.log('✅ Transporter SMTP creado exitosamente');
  return transporter;
}

// Función para enviar correo de agradecimiento de suscripción
async function sendSubscriptionThankYouEmail(email, name) {
  console.log(`📧 Enviando correo de agradecimiento de suscripción a ${email}...`);
  
  try {
    const transporter = createTransporter();
    
    // Verificar conexión SMTP
    console.log('🔍 Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada exitosamente');
    
    const mailOptions = {
      from: `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '¡Gracias por suscribirte a Pet Gourmet! 🐾',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5530; margin: 0; font-size: 28px;">¡Bienvenido a Pet Gourmet! 🐾</h1>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 15px 0;">Hola <strong>${name}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 15px 0;">¡Gracias por suscribirte a Pet Gourmet! Estamos emocionados de tenerte como parte de nuestra comunidad de amantes de las mascotas.</p>
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 15px 0;">Tu suscripción ha sido activada exitosamente y ahora tienes acceso a:</p>
            </div>
            
            <div style="background-color: #f0f8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <ul style="margin: 0; padding-left: 20px; color: #2c5530;">
                <li style="margin-bottom: 10px;">🎯 Descuentos exclusivos en productos premium</li>
                <li style="margin-bottom: 10px;">📧 Newsletter semanal con consejos de cuidado</li>
                <li style="margin-bottom: 10px;">🆕 Acceso anticipado a nuevos productos</li>
                <li style="margin-bottom: 10px;">💝 Ofertas especiales para suscriptores</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://petgourmet.com" style="display: inline-block; background-color: #2c5530; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Explorar Productos</a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">¡Gracias por confiar en Pet Gourmet!</p>
              <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">El equipo de Pet Gourmet 🐾</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="font-size: 14px; color: #856404; margin: 0;"><strong>Nota:</strong> Este es un correo de prueba del sistema de suscripciones de Pet Gourmet.</p>
            </div>
          </div>
        </div>
      `
    };
    
    console.log('📤 Enviando correo...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de suscripción enviado exitosamente!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Destinatario:', email);
    console.log('📝 Asunto:', mailOptions.subject);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Error enviando correo de suscripción:', error);
    return { success: false, error: error.message };
  }
}

// Función principal de prueba
async function testSubscriptionEmail() {
  console.log('🚀 Iniciando prueba de correo de suscripción...');
  console.log('👤 Usuario: Cristofer Escalante');
  console.log('📧 Email: cristoferscalante@gmail.com');
  console.log('🆔 UID: 2f4ec8c0-0e58-486d-9c11-a652368f7c19');
  console.log('=' .repeat(60));
  
  const userEmail = 'cristoferscalante@gmail.com';
  const userName = 'Cristofer Escalante';
  
  try {
    // Enviar correo de agradecimiento de suscripción
    const emailResult = await sendSubscriptionThankYouEmail(userEmail, userName);
    
    console.log('\n' + '=' .repeat(60));
    
    if (emailResult.success) {
      console.log('🎉 ¡ÉXITO! El correo de suscripción fue enviado correctamente');
      console.log('📧 Revisa tu bandeja de entrada en:', userEmail);
      console.log('📬 También revisa la carpeta de spam/correo no deseado');
      console.log('🆔 Message ID:', emailResult.messageId);
    } else {
      console.log('❌ FALLO: No se pudo enviar el correo');
      console.log('🔍 Error:', emailResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error.message);
  }
  
  console.log('\n🏁 Prueba finalizada');
}

// Ejecutar la prueba
testSubscriptionEmail().catch(console.error);