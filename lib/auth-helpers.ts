import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/client'

/**
 * Verifica si un usuario es administrador consultando la base de datos
 * @param userId - ID del usuario a verificar
 * @returns Promise<boolean> - true si el usuario es admin, false en caso contrario
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabaseClient = await createClient()
    
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error verificando rol de usuario:', error)
      return false
    }
    
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Error en isUserAdmin:', error)
    return false
  }
}

/**
 * Verifica si un usuario es administrador usando el cliente del navegador
 * @param userId - ID del usuario a verificar
 * @returns Promise<boolean> - true si el usuario es admin, false en caso contrario
 */
export async function isUserAdminClient(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error verificando rol de usuario:', error)
      return false
    }
    
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Error en isUserAdminClient:', error)
    return false
  }
}

/**
 * Verifica si un email pertenece a un usuario administrador
 * @param email - Email del usuario a verificar
 * @returns Promise<boolean> - true si el usuario es admin, false en caso contrario
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  try {
    const supabaseClient = await createClient()
    
    // Primero obtenemos el usuario por email
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error obteniendo usuarios:', usersError)
      return false
    }
    
    const user = users.find(u => u.email === email)
    if (!user) {
      return false
    }
    
    // Luego verificamos su rol en la tabla profiles
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Error verificando rol de usuario:', error)
      return false
    }
    
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Error en isEmailAdmin:', error)
    return false
  }
}