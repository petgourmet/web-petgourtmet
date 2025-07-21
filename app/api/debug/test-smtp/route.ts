import { NextRequest, NextResponse } from "next/server"
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    console.log('Testing SMTP configuration...')
    
    // Verificar que las variables de entorno estén configuradas
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing SMTP configuration',
        missing,
        config: {
          SMTP_HOST: !!process.env.SMTP_HOST,
          SMTP_PORT: !!process.env.SMTP_PORT,
          SMTP_USER: !!process.env.SMTP_USER,
          SMTP_PASS: !!process.env.SMTP_PASS,
          EMAIL_FROM: !!process.env.EMAIL_FROM
        }
      }, { status: 400 })
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
    
    console.log('SMTP Transporter created, verifying connection...')
    
    // Verificar conexión
    const verification = await transporter.verify()
    
    console.log('SMTP verification result:', verification)
    
    return NextResponse.json({
      success: true,
      message: 'SMTP configuration is valid',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER,
        emailFrom: process.env.EMAIL_FROM
      },
      verification: verification
    })
    
  } catch (error) {
    console.error('SMTP test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'SMTP test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASS
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to = process.env.SMTP_USER } = body
    
    console.log(`Sending test email to: ${to}`)
    
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
    
    // Email de prueba
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet Test" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Test Email - Pet Gourmet SMTP Configuration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SMTP Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #2c5aa0;">🎉 SMTP Test Successful!</h1>
          <p>This is a test email to verify that the SMTP configuration is working correctly.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>Secure:</strong> ${process.env.SMTP_SECURE}</li>
              <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          <p>If you received this email, the SMTP configuration is working correctly! 🚀</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from Pet Gourmet.<br>
            Generated on: ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `
    }
    
    console.log('Sending test email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    })
    
    const result = await transporter.sendMail(mailOptions)
    
    console.log('Test email sent successfully:', {
      messageId: result.messageId,
      response: result.response
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result: {
        messageId: result.messageId,
        response: result.response,
        to: to,
        from: mailOptions.from
      }
    })
    
  } catch (error) {
    console.error('Error sending test email:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
