import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener webhooks recientes (últimas 24 horas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(50)

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError)
      return NextResponse.json({ error: 'Error al obtener webhooks' }, { status: 500 })
    }

    // Calcular estadísticas
    const stats = {
      total: webhooks?.length || 0,
      successful: webhooks?.filter(w => w.status === 'success').length || 0,
      failed: webhooks?.filter(w => w.status === 'failed').length || 0,
      pending: webhooks?.filter(w => w.status === 'pending').length || 0,
      avgProcessingTime: webhooks?.length > 0 
        ? Math.round(webhooks.reduce((acc, w) => acc + (w.processing_time || 0), 0) / webhooks.length)
        : 0
    }

    // Formatear webhooks para el frontend
    const formattedWebhooks = webhooks?.map(webhook => ({
      id: webhook.id,
      type: webhook.event_type,
      status: webhook.status,
      timestamp: webhook.created_at,
      source: webhook.source || 'mercadopago',
      data: webhook.payload,
      error: webhook.error_message,
      processingTime: webhook.processing_time
    })) || []

    return NextResponse.json({
      webhooks: formattedWebhooks,
      stats
    })

  } catch (error) {
    console.error('Error in webhooks/recent:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}