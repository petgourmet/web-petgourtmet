import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST() {
  try {
    console.log('🔧 Creando usuario administrador temporal...')
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Cliente admin de Supabase no disponible' },
        { status: 500 }
      )
    }

    // Datos del usuario temporal
    const tempAdminEmail = 'temp.admin@petgourmet.mx'
    const tempAdminPassword = 'TempAdmin123!'
    
    // Crear usuario con contraseña conocida
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempAdminEmail,
      password: tempAdminPassword,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: 'Administrador Temporal'
      }
    })
    
    if (authError) {
      console.error('❌ Error creando usuario:', authError)
      return NextResponse.json(
        { error: 'Error creando usuario: ' + authError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Usuario creado:', authData.user.id, authData.user.email)
    
    // Crear perfil con rol admin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email || '',
        full_name: 'Administrador Temporal',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (profileError) {
      console.error('❌ Error creando perfil:', profileError)
      return NextResponse.json(
        { error: 'Error creando perfil: ' + profileError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Perfil admin creado para:', tempAdminEmail)
    
    return NextResponse.json({
      success: true,
      message: `Usuario administrador temporal creado`,
      credentials: {
        email: tempAdminEmail,
        password: tempAdminPassword
      },
      userId: authData.user.id
    })
    
  } catch (error) {
    console.error('💥 Error en create-temp-admin:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}