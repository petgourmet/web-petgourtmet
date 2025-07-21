import { NextRequest, NextResponse } from "next/server"
import { sendOrderStatusEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, email, orderNumber, customerName } = body
    
    if (!status || !email || !orderNumber || !customerName) {
      return NextResponse.json({
        error: 'status, email, orderNumber, and customerName are required'
      }, { status: 400 })
    }
    
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }
    
    console.log('Testing email send:', { status, email, orderNumber, customerName })
    
    const result = await sendOrderStatusEmail(
      status as 'pending' | 'processing' | 'completed' | 'cancelled',
      email,
      orderNumber,
      customerName
    )
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent',
      result
    })
    
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email testing endpoint',
    usage: {
      method: 'POST',
      body: {
        status: 'pending | processing | completed | cancelled',
        email: 'customer@example.com',
        orderNumber: 'PG123456',
        customerName: 'John Doe'
      }
    },
    example: {
      status: 'completed',
      email: 'test@example.com',
      orderNumber: 'PG123456789',
      customerName: 'María García'
    }
  })
}
