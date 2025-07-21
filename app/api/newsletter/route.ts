import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletterEmail } from '@/lib/contact-email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar email requerido
    if (!body.email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      )
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const email = body.email.trim().toLowerCase()
    
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del email es inválido' },
        { status: 400 }
      )
    }
    
    // Enviar email de confirmación
    const emailResult = await sendNewsletterEmail(email)
    
    if (!emailResult.success) {
      console.error('Error sending newsletter email:', emailResult.error)
      return NextResponse.json(
        { error: 'Error al procesar la suscripción. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }
    
    // Log para debugging
    console.log('Newsletter subscription successful:', {
      email,
      messageId: emailResult.messageId
    })
    
    return NextResponse.json({
      success: true,
      message: '¡Gracias por suscribirte! Revisa tu email para confirmar la suscripción.',
      data: {
        email,
        messageId: emailResult.messageId
      }
    })
    
  } catch (error) {
    console.error('Error in newsletter API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 }
    )
  }
}
