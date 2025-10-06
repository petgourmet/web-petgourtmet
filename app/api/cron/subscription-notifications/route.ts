import { NextRequest, NextResponse } from 'next/server';

// Este endpoint es llamado por el cron job de Vercel
export async function GET(request: NextRequest) {
  try {
    // Verificar que la request viene de Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // En desarrollo, permitir sin autenticación
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized' 
        }, { status: 401 });
      }
    }

    console.log('[CRON] Ejecutando procesamiento de notificaciones...');

    // Llamar al endpoint de procesamiento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/admin/subscription-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('[CRON] Resultado:', data);

    return NextResponse.json({
      success: true,
      message: 'Cron job ejecutado exitosamente',
      timestamp: new Date().toISOString(),
      result: data
    });

  } catch (error) {
    console.error('[CRON] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// También permitir POST para pruebas manuales
export async function POST(request: NextRequest) {
  return GET(request);
}
