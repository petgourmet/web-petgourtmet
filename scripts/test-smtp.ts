/**
 * Script de prueba SMTP
 * 
 * Este script valida la conexión SMTP y envía un correo de prueba
 * 
 * Uso:
 *   npx ts-node scripts/test-smtp.ts
 * 
 * O con tsx:
 *   npx tsx scripts/test-smtp.ts
 */

import nodemailer from 'nodemailer'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'bright')
  console.log('='.repeat(60) + '\n')
}

async function testSMTPConnection() {
  logSection('🔧 CONFIGURACIÓN SMTP')
  
  // Mostrar configuración (ocultando password)
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    from: process.env.EMAIL_FROM,
  }

  log('Host: ' + (config.host || '❌ NO CONFIGURADO'), config.host ? 'green' : 'red')
  log('Port: ' + config.port, 'green')
  log('Secure: ' + config.secure, 'green')
  log('User: ' + (config.user || '❌ NO CONFIGURADO'), config.user ? 'green' : 'red')
  log('From: ' + (config.from || '❌ NO CONFIGURADO'), config.from ? 'green' : 'red')
  log('Pass: ' + (process.env.SMTP_PASS ? '✅ Configurado (oculto)' : '❌ NO CONFIGURADO'), 
    process.env.SMTP_PASS ? 'green' : 'red')

  // Validar que todas las variables estén configuradas
  if (!config.host || !config.user || !process.env.SMTP_PASS) {
    log('\n❌ ERROR: Faltan variables de entorno SMTP', 'red')
    log('Asegúrate de tener en .env.local:', 'yellow')
    log('  SMTP_HOST=smtp.example.com', 'yellow')
    log('  SMTP_PORT=465', 'yellow')
    log('  SMTP_SECURE=true', 'yellow')
    log('  SMTP_USER=tu@email.com', 'yellow')
    log('  SMTP_PASS=tu_password', 'yellow')
    log('  EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"', 'yellow')
    process.exit(1)
  }

  logSection('🔌 PROBANDO CONEXIÓN SMTP')
  
  try {
    // Crear transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    log('Transporter creado correctamente', 'green')
    log('Verificando conexión...', 'cyan')

    // Verificar conexión
    await transporter.verify()
    log('✅ Conexión SMTP exitosa!', 'green')

    logSection('📧 ENVIANDO EMAIL DE PRUEBA')
    
    const testEmail = 'cristoferscalante@gmail.com'
    log(`Destinatario: ${testEmail}`, 'cyan')
    log('Enviando...', 'cyan')

    // Enviar email de prueba
    const info = await transporter.sendMail({
      from: config.from || `"Pet Gourmet" <${config.user}>`,
      to: testEmail,
      subject: '🐾 Prueba de Conexión SMTP - Pet Gourmet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #78b7bf 0%, #6aa5ad 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #fff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .success-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #78b7bf;
            }
            .info-item {
              margin: 10px 0;
              padding: 5px 0;
            }
            .label {
              font-weight: bold;
              color: #78b7bf;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #78b7bf;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="success-icon">✅</div>
            <h1 style="margin: 0;">Conexión SMTP Exitosa</h1>
          </div>
          <div class="content">
            <h2>¡Hola! 👋</h2>
            <p>Este es un correo de prueba para validar que la configuración SMTP de Pet Gourmet está funcionando correctamente.</p>
            
            <div class="info-box">
              <div class="info-item">
                <span class="label">Servidor SMTP:</span> ${config.host}
              </div>
              <div class="info-item">
                <span class="label">Puerto:</span> ${config.port}
              </div>
              <div class="info-item">
                <span class="label">Conexión Segura:</span> ${config.secure ? 'Sí (SSL/TLS)' : 'No'}
              </div>
              <div class="info-item">
                <span class="label">Usuario:</span> ${config.user}
              </div>
              <div class="info-item">
                <span class="label">Fecha:</span> ${new Date().toLocaleString('es-MX', { 
                  timeZone: 'America/Mexico_City',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>

            <h3>✅ Estado de la Prueba</h3>
            <ul>
              <li>✅ Autenticación SMTP exitosa</li>
              <li>✅ Conexión al servidor establecida</li>
              <li>✅ Email enviado correctamente</li>
              <li>✅ Sistema de correos operativo</li>
            </ul>

            <h3>📋 Próximos Pasos</h3>
            <p>Si recibiste este correo, significa que:</p>
            <ul>
              <li>Las credenciales SMTP son correctas</li>
              <li>La conexión al servidor SMTP funciona</li>
              <li>Los correos de confirmación de compra deberían enviarse correctamente</li>
              <li>Los correos de suscripción deberían funcionar sin problemas</li>
            </ul>

            <div style="text-align: center;">
              <a href="https://petgourmet.mx" class="button">Visitar Pet Gourmet</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>Pet Gourmet</strong></p>
            <p>Nutrición premium para tu mejor amigo 🐾</p>
            <p style="font-size: 10px; color: #999;">
              Este es un correo automático de prueba. Por favor no responder.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        ✅ PRUEBA DE CONEXIÓN SMTP - PET GOURMET
        
        ¡Hola!
        
        Este es un correo de prueba para validar que la configuración SMTP de Pet Gourmet está funcionando correctamente.
        
        CONFIGURACIÓN:
        - Servidor SMTP: ${config.host}
        - Puerto: ${config.port}
        - Conexión Segura: ${config.secure ? 'Sí (SSL/TLS)' : 'No'}
        - Usuario: ${config.user}
        - Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        
        ESTADO DE LA PRUEBA:
        ✅ Autenticación SMTP exitosa
        ✅ Conexión al servidor establecida
        ✅ Email enviado correctamente
        ✅ Sistema de correos operativo
        
        Si recibiste este correo, el sistema de emails está funcionando correctamente.
        
        --
        Pet Gourmet
        Nutrición premium para tu mejor amigo 🐾
      `
    })

    log('✅ Email enviado correctamente!', 'green')
    log(`\nMessage ID: ${info.messageId}`, 'cyan')
    log(`Response: ${info.response}`, 'cyan')

    logSection('✅ PRUEBA COMPLETADA CON ÉXITO')
    log('Revisa la bandeja de entrada de cristoferscalante@gmail.com', 'green')
    log('También revisa la carpeta de SPAM por si acaso', 'yellow')
    log('\nSi el correo llegó correctamente, el sistema SMTP está funcionando.', 'green')

  } catch (error: any) {
    log('\n❌ ERROR EN LA PRUEBA SMTP', 'red')
    log(`\nTipo de error: ${error.name || 'Unknown'}`, 'red')
    log(`Mensaje: ${error.message || 'No message'}`, 'red')
    
    if (error.code) {
      log(`Código: ${error.code}`, 'red')
    }

    log('\n📋 POSIBLES CAUSAS:', 'yellow')
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      log('  • Credenciales incorrectas (usuario/password)', 'yellow')
      log('  • Verifica SMTP_USER y SMTP_PASS en .env.local', 'yellow')
    } else if (error.code === 'ECONNREFUSED') {
      log('  • No se puede conectar al servidor SMTP', 'yellow')
      log('  • Verifica SMTP_HOST y SMTP_PORT', 'yellow')
      log('  • El servidor puede estar bloqueado por firewall', 'yellow')
    } else if (error.code === 'ETIMEDOUT') {
      log('  • Timeout de conexión', 'yellow')
      log('  • El servidor SMTP no responde', 'yellow')
      log('  • Verifica tu conexión a internet', 'yellow')
    } else if (error.code === 'ESOCKET') {
      log('  • Error de socket/conexión SSL/TLS', 'yellow')
      log('  • Verifica SMTP_SECURE (true/false)', 'yellow')
      log('  • Prueba cambiar el puerto (465 SSL / 587 TLS)', 'yellow')
    } else {
      log('  • Revisa la configuración SMTP completa', 'yellow')
      log('  • Verifica que el proveedor de email permita SMTP', 'yellow')
      log('  • Algunos proveedores requieren "App Passwords"', 'yellow')
    }

    log('\n🔧 SOLUCIONES COMUNES:', 'cyan')
    log('  1. Gmail: Usa contraseñas de aplicación (no tu password normal)', 'cyan')
    log('     https://support.google.com/accounts/answer/185833', 'cyan')
    log('  2. Outlook: Habilita SMTP en configuración de cuenta', 'cyan')
    log('  3. SMTP personalizado: Verifica con tu proveedor', 'cyan')
    
    process.exit(1)
  }
}

// Ejecutar prueba
testSMTPConnection().catch((error) => {
  log('\n❌ ERROR FATAL', 'red')
  console.error(error)
  process.exit(1)
})
