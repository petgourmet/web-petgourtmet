'use client'

import { useState, useEffect } from 'react'
import { Settings, Bell, Shield, Eye, EyeOff, Mail, Phone, MapPin, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { useClientAuth } from '@/hooks/use-client-auth'

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

interface UserConfigurationProps {
  userId: string
}

export default function UserConfiguration({ userId }: UserConfigurationProps) {
  const { user } = useClientAuth()
  const [config, setConfig] = useState<UserConfiguration>({
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
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'notifications' | 'privacy' | 'preferences' | 'security'>('notifications')

  useEffect(() => {
    if (userId) {
      fetchConfiguration()
    }
  }, [userId])

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/user-configuration/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setConfig(result.configuration)
      }
    } catch (error) {
      console.error('Error fetching configuration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/user-configuration/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Configuración guardada exitosamente')
      } else {
        throw new Error(result.error || 'Error guardando configuración')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof UserConfiguration['notifications'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updatePrivacySetting = (key: keyof UserConfiguration['privacy'], value: any) => {
    setConfig(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }))
  }

  const updatePreferenceSetting = (key: keyof UserConfiguration['preferences'], value: any) => {
    setConfig(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }))
  }

  const updateSecuritySetting = (key: keyof UserConfiguration['security'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }))
  }

  const sections = [
    { key: 'notifications', label: 'Notificaciones', icon: Bell },
    { key: 'privacy', label: 'Privacidad', icon: Shield },
    { key: 'preferences', label: 'Preferencias', icon: Settings },
    { key: 'security', label: 'Seguridad', icon: Eye },
  ] as const

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Configuración
        </h2>
        <button
          onClick={saveConfiguration}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Settings className="h-4 w-4" />
          )}
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navegación lateral */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === section.key
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            {/* Sección de Notificaciones */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Preferencias de Notificación
                </h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'email_marketing', label: 'Marketing por email', description: 'Recibir ofertas especiales y noticias' },
                    { key: 'order_updates', label: 'Actualizaciones de pedidos', description: 'Notificaciones sobre el estado de tus pedidos' },
                    { key: 'subscription_reminders', label: 'Recordatorios de suscripción', description: 'Avisos sobre próximos pagos y entregas' },
                    { key: 'new_products', label: 'Nuevos productos', description: 'Notificaciones sobre productos nuevos' },
                    { key: 'promotions', label: 'Promociones especiales', description: 'Ofertas limitadas y descuentos exclusivos' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.label}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notifications[item.key as keyof UserConfiguration['notifications']]}
                          onChange={(e) => updateNotificationSetting(item.key as keyof UserConfiguration['notifications'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Privacidad */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuración de Privacidad
                </h3>
                
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Visibilidad del perfil</h4>
                    <select
                      value={config.privacy.profile_visibility}
                      onChange={(e) => updatePrivacySetting('profile_visibility', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="private">Privado</option>
                      <option value="friends">Solo amigos</option>
                      <option value="public">Público</option>
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                      Controla quién puede ver tu información de perfil
                    </p>
                  </div>

                  {[
                    { key: 'email_visibility', label: 'Mostrar email', icon: Mail },
                    { key: 'phone_visibility', label: 'Mostrar teléfono', icon: Phone },
                    { key: 'address_visibility', label: 'Mostrar dirección', icon: MapPin }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{item.label}</h4>
                          <p className="text-sm text-gray-600">
                            Permitir que otros vean esta información
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.privacy[item.key as keyof UserConfiguration['privacy']] as boolean}
                          onChange={(e) => updatePrivacySetting(item.key as keyof UserConfiguration['privacy'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Preferencias */}
            {activeSection === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferencias Generales
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="h-4 w-4 inline mr-1" />
                        Idioma
                      </label>
                      <select
                        value={config.preferences.language}
                        onChange={(e) => updatePreferenceSetting('language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                      <select
                        value={config.preferences.currency}
                        onChange={(e) => updatePreferenceSetting('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="MXN">Peso Mexicano (MXN)</option>
                        <option value="USD">Dólar Americano (USD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                    <select
                      value={config.preferences.theme}
                      onChange={(e) => updatePreferenceSetting('theme', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instrucciones de entrega
                    </label>
                    <textarea
                      value={config.preferences.delivery_instructions || ''}
                      onChange={(e) => updatePreferenceSetting('delivery_instructions', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Ej: Dejar en la puerta, tocar el timbre dos veces..."
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horario preferido de entrega
                    </label>
                    <select
                      value={config.preferences.preferred_delivery_time || ''}
                      onChange={(e) => updatePreferenceSetting('preferred_delivery_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Sin preferencia</option>
                      <option value="morning">Mañana (9:00 - 12:00)</option>
                      <option value="afternoon">Tarde (12:00 - 18:00)</option>
                      <option value="evening">Noche (18:00 - 21:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Seguridad */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Configuración de Seguridad
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Autenticación de dos factores</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Agrega una capa extra de seguridad a tu cuenta
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        {config.security.two_factor_enabled ? 'Activada' : 'Desactivada'}
                      </span>
                      <button
                        onClick={() => {
                          if (config.security.two_factor_enabled) {
                            updateSecuritySetting('two_factor_enabled', false)
                            toast.info('Autenticación de dos factores desactivada')
                          } else {
                            toast.info('Configuración de 2FA disponible próximamente')
                          }
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          config.security.two_factor_enabled
                            ? 'text-red-600 bg-red-100 hover:bg-red-200'
                            : 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                        }`}
                      >
                        {config.security.two_factor_enabled ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>

                  {[
                    { 
                      key: 'login_notifications', 
                      label: 'Notificaciones de inicio de sesión', 
                      description: 'Recibir alertas cuando alguien acceda a tu cuenta' 
                    },
                    { 
                      key: 'account_activity_alerts', 
                      label: 'Alertas de actividad de cuenta', 
                      description: 'Notificaciones sobre cambios importantes en tu cuenta' 
                    }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.label}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.security[item.key as keyof UserConfiguration['security']]}
                          onChange={(e) => updateSecuritySetting(item.key as keyof UserConfiguration['security'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Cambiar contraseña</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Se recomienda cambiar tu contraseña periódicamente
                    </p>
                    <button
                      onClick={() => toast.info('Cambio de contraseña disponible próximamente')}
                      className="px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
                    >
                      Cambiar Contraseña
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
