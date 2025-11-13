import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

/**
 * API para probar la conexión SMTP
 * 
 * Endpoints:
 *   GET /api/test-smtp - Verifica configuración
 *   POST /api/test-smtp - Envía email de prueba
 * 
 * Body (POST):
 *   {
 *     "email": "destinatario@example.com"
 *   }
 */

export async function GET(request: NextRequest) {
  try {
    // Verificar configuración SMTP
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      from: process.env.EMAIL_FROM,
      hasPassword: !!process.env.SMTP_PASS
    }

    const isConfigured = config.host && config.user && config.hasPassword

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      config: {
        host: config.host || null,
        port: config.port,
        secure: config.secure,
        user: config.user || null,
        from: config.from || null,
        hasPassword: config.hasPassword
      },
      missing: [
        !config.host && 'SMTP_HOST',
        !config.user && 'SMTP_USER',
        !config.hasPassword && 'SMTP_PASS'
      ].filter(Boolean)
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email es requerido'
      }, { status: 400 })
    }

    // Validar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({
        success: false,
        error: 'Configuración SMTP incompleta',
        missing: [
          !process.env.SMTP_HOST && 'SMTP_HOST',
          !process.env.SMTP_USER && 'SMTP_USER',
          !process.env.SMTP_PASS && 'SMTP_PASS'
        ].filter(Boolean)
      }, { status: 500 })
    }

    // Crear transporter
    const transporter = nodemailer.createTransport({
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
    })

    // Verificar conexión
    await transporter.verify()

    // Enviar email de prueba
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: email,
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
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 12px;
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
            <p>Este es un correo de prueba desde Pet Gourmet para validar la conexión SMTP.</p>
            
            <div class="info-box">
              <p><strong>Servidor:</strong> ${process.env.SMTP_HOST}</p>
              <p><strong>Puerto:</strong> ${process.env.SMTP_PORT}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX', { 
                timeZone: 'America/Mexico_City'
              })}</p>
            </div>

            <h3>✅ Sistema de correos operativo</h3>
            <p>Si recibiste este correo, la configuración SMTP está funcionando correctamente.</p>
          </div>
          <div class="footer">
            <p><strong>Pet Gourmet</strong></p>
            <p>Nutrición premium para tu mejor amigo 🐾</p>
          </div>
        </body>
        </html>
      `,
      text: `
        ✅ PRUEBA DE CONEXIÓN SMTP - PET GOURMET
        
        ¡Hola!
        
        Este es un correo de prueba desde Pet Gourmet para validar la conexión SMTP.
        
        Servidor: ${process.env.SMTP_HOST}
        Puerto: ${process.env.SMTP_PORT}
        Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        
        Si recibiste este correo, la configuración SMTP está funcionando correctamente.
        
        --
        Pet Gourmet
        Nutrición premium para tu mejor amigo 🐾
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Email enviado correctamente',
      messageId: info.messageId,
      response: info.response,
      to: email
    })

  } catch (error: any) {
    console.error('Error en test SMTP:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: {
        name: error.name,
        responseCode: error.responseCode,
        command: error.command
      }
    }, { status: 500 })
  }
}
