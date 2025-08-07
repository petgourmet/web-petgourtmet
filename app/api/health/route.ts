import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Servidor funcionando correctamente'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Error en el servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}