import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Iniciando prueba de email...')
    
    // Verificar variables de entorno
    const requiredEnvs = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM
    }
    
    console.log('📧 Variables SMTP:', {
      SMTP_HOST: requiredEnvs.SMTP_HOST,
      SMTP_PORT: requiredEnvs.SMTP_PORT,
      SMTP_SECURE: requiredEnvs.SMTP_SECURE,
      SMTP_USER: requiredEnvs.SMTP_USER,
      SMTP_PASS: requiredEnvs.SMTP_PASS ? '***' : 'NO_SET',
      SMTP_FROM: requiredEnvs.SMTP_FROM
    })
    
    // Verificar que todas las variables estén presentes
    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
    
    if (missingEnvs.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno faltantes',
        missing: missingEnvs
      }, { status: 400 })
    }
    
    // Crear transportador
    console.log('🚀 Creando transportador...')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
    
    // Verificar conexión
    console.log('🔍 Verificando conexión SMTP...')
    await transporter.verify()
    console.log('✅ Conexión SMTP verificada')
    
    // Enviar email de prueba
    console.log('📤 Enviando email de prueba...')
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
      to: 'contacto@petgourmet.mx',
      subject: '🧪 Prueba de Email - PetGourmet',
      text: 'Este es un email de prueba para verificar la configuración SMTP.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Prueba de Email</h2>
          <p>Este es un email de prueba para verificar que la configuración SMTP está funcionando correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Sistema:</strong> PetGourmet</p>
        </div>
      `
    })
    
    console.log('✅ Email enviado exitosamente:', info.messageId)
    
    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: info.messageId,
      response: info.response
    })
    
  } catch (error: any) {
    console.error('❌ Error enviando email:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de prueba de email. Usa POST para enviar un email de prueba.'
  })
}