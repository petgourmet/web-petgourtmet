import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST() {
  try {
    console.log('🔧 Configurando usuario administrador...')
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Cliente admin de Supabase no disponible' },
        { status: 500 }
      )
    }

    // Email del usuario que debe ser admin
    const adminEmail = 'fabian.gutierrez@petgourmet.mx'
    
    // Buscar el usuario por email
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError)
      return NextResponse.json(
        { error: 'Error obteniendo usuarios' },
        { status: 500 }
      )
    }
    
    const user = users.find(u => u.email === adminEmail)
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', adminEmail)
      return NextResponse.json(
        { error: `Usuario ${adminEmail} no encontrado` },
        { status: 404 }
      )
    }
    
    console.log('✅ Usuario encontrado:', user.id, user.email)
    
    // Verificar si ya existe un perfil para este usuario
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error verificando perfil existente:', profileError)
      return NextResponse.json(
        { error: 'Error verificando perfil existente' },
        { status: 500 }
      )
    }
    
    if (existingProfile) {
      // Actualizar el rol si el perfil ya existe
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('❌ Error actualizando perfil:', updateError)
        return NextResponse.json(
          { error: 'Error actualizando perfil de usuario' },
          { status: 500 }
        )
      }
      
      console.log('✅ Perfil actualizado a admin para:', adminEmail)
    } else {
      // Crear un nuevo perfil con rol admin
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('❌ Error creando perfil:', insertError)
        return NextResponse.json(
          { error: 'Error creando perfil de usuario' },
          { status: 500 }
        )
      }
      
      console.log('✅ Perfil creado con rol admin para:', adminEmail)
    }
    
    return NextResponse.json({
      success: true,
      message: `Usuario ${adminEmail} configurado como administrador`,
      userId: user.id
    })
    
  } catch (error) {
    console.error('💥 Error en setup-admin-user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}