import { NextRequest, NextResponse } from 'next/server'
import { earlyAlertService } from '../../../../lib/early-alert-service'

// 🔄 ENDPOINT PARA VERIFICACIÓN PROGRAMADA DE SUSCRIPCIONES PRÓXIMAS A VENCER
export async function POST(request: NextRequest) {
  try {
    // Verificar autorización (en producción usar un token secreto)
    const authToken = request.headers.get('authorization')
    if (authToken !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('🔄 Ejecutando verificación programada de alertas tempranas...')
    
    // Ejecutar verificación de alertas tempranas
    await earlyAlertService.runScheduledCheck()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Verificación de alertas tempranas completada exitosamente',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error en endpoint de verificación programada:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}