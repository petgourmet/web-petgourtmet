import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'No autenticado', details: authError?.message },
        { status: 401 }
      )
    }

    console.log('✅ Usuario autenticado:', user.email, '(', user.id, ')')

    // Obtener suscripciones del usuario
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        products (
          id,
          name,
          image,
          price
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Error al cargar suscripciones', details: error.message },
        { status: 500 }
      )
    }

    console.log(`📋 Suscripciones encontradas: ${subscriptions?.length || 0}`)

    return NextResponse.json({
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0
    })
  } catch (error) {
    console.error('Error in GET /api/user/subscriptions:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
