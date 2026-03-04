/**
 * Script para probar el diseño de los correos con el logo de Pet Gourmet
 * Este script genera archivos HTML de ejemplo para visualizar los correos
 */

import * as fs from 'fs';
import * as path from 'path';

// Simular las funciones de plantillas (versión simplificada para testing)
function generateOrderStatusEmail(status: string) {
  const logoUrl = 'https://petgourmet.mx/petgourmet-logo.png';
  
  const statusMessages: Record<string, any> = {
    pending: {
      title: 'Completar tu compra',
      intro: 'Hola Juan Pérez, tu pedido ha sido registrado.',
      message: 'Estos artículos estarán siendo procesados una vez completado o verificado el pago.',
    },
    processing: {
      title: '¡Gracias por tu compra!',
      intro: 'Hola Juan Pérez, estamos preparando tu pedido para enviarlo.',
      message: 'Regularmente enviamos todas nuestras deliciosas recetas al día siguiente de tu compra.',
    },
    shipped: {
      title: 'Tu pedido está en camino',
      intro: 'Tu pedido está en camino. Rastrea tu envío para ver el estado de la entrega.',
      message: '',
    },
    completed: {
      title: 'Tu pedido se ha entregado',
      intro: '¿No has recibido tu pedido? Infórmanos.',
      message: '',
    },
  };

  const statusInfo = statusMessages[status];
  const orderId = 'PG-12345';

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${statusInfo.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
        
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header con Logo -->
          <table style="width: 100%; margin-bottom: 30px; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); border-radius: 8px 8px 0 0;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 30px 20px;" valign="middle">
                <table style="width: 100%;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 70%;" valign="middle">
                      <img src="${logoUrl}" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;" />
                    </td>
                    <td style="width: 30%; text-align: right; vertical-align: middle;" valign="middle">
                      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px; backdrop-filter: blur(10px);">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Pedido</p>
                        <p style="margin: 0; color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">#${orderId}</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="background-color: transparent;">
            
            <h2 style="font-size: 20px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">${statusInfo.title}</h2>
            
            <p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 10px;">${statusInfo.intro}</p>
            ${statusInfo.message ? `<p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 30px;">${statusInfo.message}</p>` : ''}

            <!-- Progreso del Pedido -->
            <div style="margin-bottom: 40px; padding: 20px; background-color: white; border-radius: 8px; border: 1px solid #E5E7EB;">
              <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Progreso del Pedido</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['pending', 'processing', 'shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">1</div>
                    <div style="color: ${['pending', 'processing', 'shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Confirmado</div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['processing', 'shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">2</div>
                    <div style="color: ${['processing', 'shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Preparando</div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">3</div>
                    <div style="color: ${['shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">En camino</div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${status === 'completed' ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">4</div>
                    <div style="color: ${status === 'completed' ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Entregado</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Productos de ejemplo -->
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 15px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">Resumen del pedido</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; width: 60px;">
                      <div style="width: 50px; height: 50px; background-color: #d1d5db; border-radius: 8px;"></div>
                    </td>
                    <td style="padding: 15px 10px; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: left;">
                      <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151; text-transform: uppercase;">COMIDA PREMIUM PARA PERROS × 2</p>
                      <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Talla: 5kg</p>
                    </td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: right; width: 100px;">
                      <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151;">$800.00</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td style="width: 40%;"></td>
                  <td style="width: 60%;">
                    <table style="width: 100%; font-size: 13px; color: #6b7280;">
                      <tr>
                        <td style="padding: 5px 0;">Subtotal</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$800.00</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">Envíos</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$100.00</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px;">Impuestos</td>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px; text-align: right; color: #374151;">$0.00</td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 5px; font-size: 15px; color: #6b7280;">Total</td>
                        <td style="padding: 20px 0 5px; text-align: right; font-size: 18px; font-weight: bold; color: #374151;">$900.00 MXN</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

          </div>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: left;">
            <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
              Si tienes alguna pregunta, responde este correo electrónico o contáctanos a través de 
              <a href="mailto:contacto@petgourmet.mx" style="color: #7AB8BF; text-decoration: none;">contacto@petgourmet.mx</a>
            </p>
          </div>

        </div>
      </body>
    </html>
  `;
}

// Generar archivos HTML de ejemplo
const outputDir = path.join(__dirname, '../test-emails');

// Crear directorio si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generar correos para cada estado
const statuses = ['pending', 'processing', 'shipped', 'completed'];

statuses.forEach(status => {
  const html = generateOrderStatusEmail(status);
  const filename = `email-${status}.html`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`✅ Generado: ${filename}`);
});

console.log(`\n🎉 Archivos de prueba generados en: ${outputDir}`);
console.log(`\n📝 Para ver los correos:`);
console.log(`   Abre los archivos .html en tu navegador\n`);
