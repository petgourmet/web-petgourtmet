import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Obtener usuarios de auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error obteniendo usuarios de auth:', authError)
      return NextResponse.json({ error: 'Error obteniendo usuarios de auth' }, { status: 500 })
    }
    
    // Obtener perfiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(20)
    
    if (profileError) {
      console.error('Error obteniendo perfiles:', profileError)
    }
    
    const users = authUsers.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      profile: profiles?.find(p => p.id === user.id)
    }))
    
    return NextResponse.json({
      success: true,
      authUsersCount: authUsers.users.length,
      profilesCount: profiles?.length || 0,
      users: users.slice(0, 10) // Solo mostrar los primeros 10
    })
    
  } catch (error) {
    console.error('Error en debug-users:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}