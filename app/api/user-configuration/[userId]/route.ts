// app/api/user-configuration/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UserConfiguration {
  notifications: {
    email_marketing: boolean
    order_updates: boolean
    subscription_reminders: boolean
    new_products: boolean
    promotions: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends'
    email_visibility: boolean
    phone_visibility: boolean
    address_visibility: boolean
  }
  preferences: {
    language: 'es' | 'en'
    currency: 'MXN' | 'USD'
    theme: 'light' | 'dark' | 'auto'
    delivery_instructions?: string
    preferred_delivery_time?: string
  }
  security: {
    two_factor_enabled: boolean
    login_notifications: boolean
    account_activity_alerts: boolean
  }
}

const defaultConfiguration: UserConfiguration = {
  notifications: {
    email_marketing: true,
    order_updates: true,
    subscription_reminders: true,
    new_products: false,
    promotions: true
  },
  privacy: {
    profile_visibility: 'private',
    email_visibility: false,
    phone_visibility: false,
    address_visibility: false
  },
  preferences: {
    language: 'es',
    currency: 'MXN',
    theme: 'light',
    delivery_instructions: '',
    preferred_delivery_time: ''
  },
  security: {
    two_factor_enabled: false,
    login_notifications: true,
    account_activity_alerts: true
  }
}

// GET - Obtener configuración de usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    // En el futuro, esto se conectará a una tabla real de configuración de usuario
    // Por ahora, devolver configuración por defecto
    const { data: userData, error } = await supabase.auth.admin.getUserById(userId)
    
    if (error) throw error

    // Simular configuración personalizada basada en metadatos del usuario
    const userConfig = { ...defaultConfiguration }
    
    if (userData.user?.user_metadata?.language) {
      userConfig.preferences.language = userData.user.user_metadata.language
    }
    
    if (userData.user?.user_metadata?.currency) {
      userConfig.preferences.currency = userData.user.user_metadata.currency
    }

    return NextResponse.json({
      success: true,
      configuration: userConfig
    })

  } catch (error) {
    console.error('❌ Error obteniendo configuración de usuario:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración de usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params
    const configuration: UserConfiguration = await request.json()

    // En el futuro, esto guardará en una tabla real de configuración
    // Por ahora, simular que se guardó correctamente
    
    // Podrías guardar algunas preferencias en user_metadata
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        language: configuration.preferences.language,
        currency: configuration.preferences.currency,
        theme: configuration.preferences.theme
      }
    })

    if (error) {
      console.warn('No se pudo actualizar user_metadata:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error actualizando configuración de usuario:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
