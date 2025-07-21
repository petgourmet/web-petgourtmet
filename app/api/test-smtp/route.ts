import { NextRequest, NextResponse } from 'next/server'
import { sendContactEmails, sendNewsletterEmail } from '@/lib/contact-email-service'

export async function POST(request: NextRequest) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint disabled in production' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { testType, ...data } = body

    let result

    switch (testType) {
      case 'contact':
        // Test del formulario de contacto
        result = await sendContactEmails({
          name: data.name || 'Cristófer Escalante (PRUEBA)',
          email: data.email || 'cristoferscalante@gmail.com',
          phone: data.phone || '+52 55 1234 5678',
          message: data.message || 'Este es un mensaje de prueba del sistema SMTP de Pet Gourmet. Si recibes este email, ¡el sistema está funcionando correctamente! 🐾\n\nEste email incluye:\n- Confirmación al cliente\n- Notificación al admin\n- Templates HTML profesionales\n- Información de contacto completa',
          formType: 'contact'
        })
        break

      case 'newsletter':
        // Test del newsletter
        result = await sendNewsletterEmail(data.email || 'cristoferscalante@gmail.com')
        break

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use "contact" or "newsletter"' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Email sent successfully' : 'Email failed to send',
      details: result,
      testType,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in SMTP test:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint disabled in production' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'SMTP Test Endpoint',
    availableTests: [
      {
        type: 'contact',
        description: 'Test contact form emails (customer + admin)',
        method: 'POST',
        payload: {
          testType: 'contact',
          name: 'Test User (optional)',
          email: 'test@example.com (optional)',
          phone: '+525561269681 (optional)',
          message: 'Test message (optional)'
        }
      },
      {
        type: 'newsletter',
        description: 'Test newsletter confirmation email',
        method: 'POST',
        payload: {
          testType: 'newsletter',
          email: 'test@example.com (optional)'
        }
      }
    ],
    smtpConfig: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      from: process.env.EMAIL_FROM
    },
    timestamp: new Date().toISOString()
  })
}
