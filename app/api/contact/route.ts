import { NextRequest, NextResponse } from 'next/server'
import { sendContactEmails, ContactFormData } from '@/lib/contact-email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar campos requeridos
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Nombre, email y mensaje son campos requeridos' },
        { status: 400 }
      )
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'El formato del email es inválido' },
        { status: 400 }
      )
    }
    
    // Preparar datos del formulario
    const contactData: ContactFormData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || undefined,
      message: body.message.trim(),
      formType: 'contact'
    }
    
    // Enviar emails
    const emailResult = await sendContactEmails(contactData)
    
    if (!emailResult.success) {
      console.error('Error sending emails:', emailResult.error)
      return NextResponse.json(
        { error: 'Error al enviar emails. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }
    
    // Log para debugging
    console.log('Contact form submitted successfully:', {
      name: contactData.name,
      email: contactData.email,
      customerMessageId: emailResult.customerMessageId,
      adminMessageId: emailResult.adminMessageId
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tu mensaje ha sido enviado correctamente. Te responderemos pronto.',
      data: {
        customerMessageId: emailResult.customerMessageId,
        adminMessageId: emailResult.adminMessageId
      }
    })
    
  } catch (error) {
    console.error('Error in contact API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 }
    )
  }
}
