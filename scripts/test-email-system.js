// Script para probar el sistema de correos
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('🔍 Variables de entorno cargadas:');
console.log('SMTP_HOST:', process.env.SMTP_HOST ? '✅ Configurado' : '❌ No configurado');
console.log('SMTP_PORT:', process.env.SMTP_PORT ? '✅ Configurado' : '❌ No configurado');
console.log('SMTP_USER:', process.env.SMTP_USER ? '✅ Configurado' : '❌ No configurado');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurado' : '❌ No configurado');
console.log('');

// Crear transporter SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Plantillas de correo simplificadas para prueba
const emailTemplates = {
  pending: (orderNumber, customerName) => ({
    subject: `¡Gracias por tu compra! - Orden #${orderNumber}`,
    html: `<h1>¡Gracias por tu compra, ${customerName}!</h1><p>Tu orden <strong>#${orderNumber}</strong> está pendiente.</p>`
  }),
  processing: (orderNumber, customerName) => ({
    subject: `Tu pedido está en camino - Orden #${orderNumber}`,
    html: `<h1>¡Tu pedido está en camino, ${customerName}!</h1><p>Tu orden <strong>#${orderNumber}</strong> está siendo procesada.</p>`
  }),
  completed: (orderNumber, customerName) => ({
    subject: `¡Pedido entregado! - Orden #${orderNumber}`,
    html: `<h1>¡Pedido entregado exitosamente! 🎉</h1><p>Hola ${customerName}, tu orden <strong>#${orderNumber}</strong> ha sido entregada.</p>`
  }),
  cancelled: (orderNumber, customerName) => ({
    subject: `Pedido cancelado - Orden #${orderNumber}`,
    html: `<h1>Pedido cancelado</h1><p>Hola ${customerName}, tu orden <strong>#${orderNumber}</strong> ha sido cancelada.</p>`
  })
};

// Función para enviar correo de estado de orden
async function sendOrderStatusEmail(orderStatus, customerEmail, orderNumber, customerName) {
  try {
    console.log(`Sending ${orderStatus} email to ${customerEmail} for order ${orderNumber}`);
    
    const template = emailTemplates[orderStatus](orderNumber, customerName);
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, skipping email send');
      return { success: false, error: 'SMTP not configured' };
    }
    
    const transporter = createTransporter();
    
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return { success: false, error: 'SMTP connection failed' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: result.messageId,
      response: result.response
    });
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    };
    
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Función para enviar correo de confirmación de webhook
async function sendOrderConfirmationEmail(order, paymentData) {
  try {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #16a34a;">✅ ¡Pago confirmado!</h1>
        <p>Tu pedido ha sido procesado exitosamente</p>
        <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3>📦 Detalles del pedido</h3>
          <ul>
            <li><strong>Número de pedido:</strong> ${order.id}</li>
            <li><strong>Monto pagado:</strong> $${paymentData.transaction_amount} ${paymentData.currency_id}</li>
            <li><strong>Método de pago:</strong> ${paymentData.payment_method_id}</li>
            <li><strong>Fecha de pago:</strong> ${new Date(paymentData.date_created).toLocaleDateString('es-MX')}</li>
          </ul>
        </div>
        <p>¡Gracias por tu compra! Procesaremos tu pedido pronto.</p>
      </div>
    `;

    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
      to: paymentData.payer.email,
      subject: '✅ Pago confirmado - Pet Gourmet',
      html: emailTemplate
    });
    
    console.log(`📧 Email de confirmación enviado a ${paymentData.payer.email}`);
  } catch (error) {
    console.error('❌ Error enviando email de confirmación:', error);
  }
}

// Función para probar el envío de correos del sistema de estado de órdenes
async function testOrderStatusEmails() {
  console.log('🧪 Probando sistema de correos de estado de órdenes...');
  
  const testEmail = 'test@example.com';
  const testOrderNumber = 'TEST-001';
  const testCustomerName = 'Cliente de Prueba';
  
  // Probar cada estado de orden
  const statuses = ['pending', 'processing', 'completed', 'cancelled'];
  
  for (const status of statuses) {
    console.log(`\n📧 Probando correo de estado: ${status}`);
    
    try {
      const result = await sendOrderStatusEmail(
        status,
        testEmail,
        testOrderNumber,
        testCustomerName
      );
      
      if (result.success) {
        console.log(`✅ Correo de ${status} enviado exitosamente`);
        console.log(`   Message ID: ${result.messageId}`);
      } else {
        console.log(`❌ Error enviando correo de ${status}: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error en prueba de ${status}:`, error.message);
    }
    
    // Esperar un poco entre envíos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Función para probar el webhook de confirmación de pago
async function testWebhookEmail() {
  console.log('\n🧪 Probando correo de confirmación de webhook...');
  
  try {
    // Simular datos de pago aprobado
    const mockPaymentData = {
      id: 123456789,
      status: 'approved',
      status_detail: 'accredited',
      date_created: new Date().toISOString(),
      transaction_amount: 500.00,
      currency_id: 'MXN',
      payment_method_id: 'visa',
      payment_type_id: 'credit_card',
      external_reference: 'TEST-ORDER-001',
      payer: {
        id: 'test-payer',
        email: 'test@example.com',
        first_name: 'Cliente',
        last_name: 'de Prueba'
      }
    };
    
    // Simular orden
    const mockOrder = {
      id: 'TEST-ORDER-001',
      customer_email: 'test@example.com',
      customer_name: 'Cliente de Prueba',
      total: 500.00
    };
    
    // Enviar correo de confirmación
    await sendOrderConfirmationEmail(mockOrder, mockPaymentData);
    console.log('✅ Correo de confirmación de webhook enviado');
    
  } catch (error) {
    console.error('❌ Error en prueba de webhook:', error.message);
  }
}

// Función para verificar configuración SMTP
function checkSMTPConfig() {
  console.log('🔧 Verificando configuración SMTP...');
  
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS'
  ];
  
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✅ ${varName}: ${varName === 'SMTP_PASS' ? '***' : process.env[varName]}`);
    }
  }
  
  if (missing.length > 0) {
    console.log(`❌ Variables faltantes: ${missing.join(', ')}`);
    return false;
  }
  
  console.log('✅ Configuración SMTP completa');
  return true;
}

// Ejecutar pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas del sistema de correos\n');
  
  // Verificar configuración
  if (!checkSMTPConfig()) {
    console.log('\n❌ No se puede continuar sin configuración SMTP completa');
    return;
  }
  
  // Probar correos de estado de órdenes
  await testOrderStatusEmails();
  
  // Probar correo de webhook
  await testWebhookEmail();
  
  console.log('\n🏁 Pruebas completadas');
}

// Función para enviar correo de prueba a una dirección específica
async function sendTestEmail(recipientEmail) {
  console.log(`📧 Enviando correo de prueba a ${recipientEmail}...`);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'contacto@petgourmet.mx',
    to: recipientEmail,
    subject: '🐕 Correo de Prueba - Pet Gourmet',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c5530; text-align: center; margin-bottom: 30px;">🐕 Pet Gourmet</h1>
          
          <h2 style="color: #4a7c59; margin-bottom: 20px;">¡Correo de Prueba Exitoso!</h2>
          
          <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
            Este es un correo de prueba del sistema de notificaciones de Pet Gourmet.
          </p>
          
          <div style="background-color: #f0f8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c5530; margin-top: 0;">✅ Sistema de Correos Funcionando</h3>
            <p style="color: #333; margin-bottom: 0;">
              Si recibes este correo, significa que el sistema de notificaciones está configurado correctamente.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Fecha de envío: ${new Date().toLocaleString('es-MX')}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              Pet Gourmet - Nutrición Premium para tu Mascota
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de prueba enviado exitosamente:', info.messageId);
    console.log('📧 Destinatario:', recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de prueba:', error.message);
    return false;
  }
}

// Función principal para ejecutar todas las pruebas
async function main() {
  console.log('🧪 Iniciando pruebas del sistema de correos...');
  
  await checkSMTPConfig();
  
  // Enviar correo de prueba a cristoferscalante@gmail.com
  await sendTestEmail('cristoferscalante@gmail.com');
  
  console.log('✅ Todas las pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testOrderStatusEmails,
  testWebhookEmail,
  checkSMTPConfig,
  runTests,
  sendTestEmail
};