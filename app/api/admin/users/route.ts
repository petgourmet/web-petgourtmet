import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando obtención de usuarios admin...')
    
    const supabase = await createClient()

    // Verificar autenticación del usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Usuario autenticado:', user?.email || 'No user')
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autenticado. Por favor inicia sesión.' },
        { status: 401 }
      )
    }

    // Verificar si es admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    console.log('Perfil del usuario:', profile)

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'Error verificando permisos de usuario' },
        { status: 500 }
      )
    }

    if (!profile || profile.role !== 'admin') {
      console.error('❌ Usuario no es admin:', user.email, 'Rol:', profile?.role)
      return NextResponse.json(
        { error: 'No autorizado. Se requieren permisos de administrador.' },
        { status: 403 }
      )
    }

    console.log('✅ Usuario verificado como admin')

    // Obtener usuarios usando el cliente admin
    let authUsers = null
    let profiles = null

    try {
      console.log('📋 Obteniendo usuarios de auth...')
      
      if (!supabaseAdmin) {
        throw new Error('Cliente admin no configurado. Verifica SUPABASE_SERVICE_ROLE_KEY.')
      }
      
      const { data: authData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (authUsersError) {
        console.error('❌ Error obteniendo usuarios de auth:', authUsersError)
        throw authUsersError
      }
      
      authUsers = authData
      console.log(`✅ ${authUsers?.users?.length || 0} usuarios obtenidos de auth`)

    } catch (authError) {
      console.error('❌ Error con client admin de auth:', authError)
      return NextResponse.json(
        { error: 'Error obteniendo usuarios del sistema de autenticación: ' + String(authError) },
        { status: 500 }
      )
    }

    try {
      console.log('👤 Obteniendo perfiles...')
      
      if (!supabaseAdmin) {
        throw new Error('Cliente admin no configurado')
      }
      
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('⚠️ Error obteniendo perfiles:', profilesError)
        // No fallar por esto, usar datos básicos
      } else {
        profiles = profilesData
        console.log(`✅ ${profiles?.length || 0} perfiles obtenidos`)
      }

    } catch (profileError) {
      console.error('⚠️ Error con perfiles:', profileError)
      // Continuar sin perfiles adicionales
    }

    // Combinar datos
    const combinedUsers = (authUsers?.users || []).map((authUser: any) => {
      const userProfile = profiles?.find((p: any) => p.id === authUser.id)
      
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        phone: authUser.phone,
        // Información del profile
        full_name: userProfile?.full_name || authUser.user_metadata?.full_name || 'No especificado',
        role: userProfile?.role || authUser.user_metadata?.role || 'user',
        // Estados
        is_confirmed: !!authUser.email_confirmed_at,
        is_active: !authUser.banned_until,
        // Última actividad
        updated_at: userProfile?.updated_at || authUser.updated_at
      }
    })

    console.log(`✅ API usuarios completada: ${combinedUsers.length} usuarios procesados`)

    return NextResponse.json({ 
      success: true,
      users: combinedUsers,
      count: combinedUsers.length 
    })

  } catch (error: any) {
    console.error('❌ Error general en API usuarios:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
