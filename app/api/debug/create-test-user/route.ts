import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { id, email, full_name } = await request.json()
    
    if (!id || !email || !full_name) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: id, email, full_name'
      }, { status: 400 })
    }
    
    const supabase = createServiceClient()
    
    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single()
    
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Usuario ya existe',
        user: existingUser
      })
    }
    
    // Crear el usuario en la tabla profiles
    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert([{
        id,
        email,
        full_name,
        role: 'user',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creando usuario de prueba:', error)
      return NextResponse.json({
        success: false,
        error: `Error creando usuario: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Usuario de prueba creado exitosamente',
      user: newUser
    })
    
  } catch (error) {
    console.error('Error en create-test-user:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}