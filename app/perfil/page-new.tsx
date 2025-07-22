'use client'

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { useClientAuth } from "@/hooks/use-client-auth"
import { createClient } from "@/lib/supabase/client"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Package,
  CreditCard,
  Receipt,
  Settings,
  Shield,
  Bell,
  Save,
  Edit3,
  Plus
} from "lucide-react"

// Importar los nuevos componentes
import UserSubscriptions from "@/components/user-subscriptions"
import UserPaymentMethods from "@/components/user-payment-methods"
import UserBillingHistory from "@/components/user-billing-history"
import UserPurchases from "@/components/user-purchases"
import UserConfiguration from "@/components/user-configuration"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  birth_date?: string
  avatar_url?: string
}

export default function PerfilPage() {
  const { user, loading } = useClientAuth()
  const supabase = createClient()
  
  // Estados principales
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estados de datos adicionales (para compatibilidad con código existente)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loadingStates, setLoadingStates] = useState({
    subscriptions: true,
    payments: true,
    billing: true,
    orders: true
  })

  useEffect(() => {
    if (user && !loading) {
      initializeProfile()
    }
  }, [user, loading])

  const initializeProfile = async () => {
    setIsLoading(true)
    try {
      // Inicializar perfil del usuario
      if (user) {
        const initialProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          state: user.user_metadata?.state || '',
          postal_code: user.user_metadata?.postal_code || '',
          country: user.user_metadata?.country || 'México',
          birth_date: user.user_metadata?.birth_date || '',
          avatar_url: user.user_metadata?.avatar_url || ''
        }
        setProfile(initialProfile)
        
        // Cargar datos adicionales en paralelo
        await Promise.allSettled([
          fetchSubscriptions(),
          fetchPaymentMethods(),
          fetchBillingHistory(),
          fetchOrders()
        ])
      }
    } catch (error) {
      console.error("Error inicializando perfil:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del perfil",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    if (!user) return
    try {
      setLoadingStates(prev => ({ ...prev, subscriptions: true }))
      
      // Intentar obtener suscripciones reales desde la API de MercadoPago
      const response = await fetch(`/api/subscriptions/user/${user.id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        setSubscriptions(result.subscriptions || [])
      } else {
        // Fallback: buscar órdenes que contengan suscripciones
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
          .order("created_at", { ascending: false })

        if (error) throw error
        
        // Filtrar y procesar órdenes que contengan suscripciones
        const subscriptionOrders = (data || []).filter(order => {
          if (!order.shipping_address) return false
          try {
            const orderData = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
            
            return orderData?.items?.some((item: any) => item.isSubscription || item.subscription)
          } catch (e) {
            return false
          }
        }).map(order => {
          const orderData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          return {
            ...order,
            orderData,
            customer_name: orderData?.customer_data?.full_name || orderData?.customer_data?.name || user?.email || "Cliente",
            subscriptionItems: orderData?.items?.filter((item: any) => item.isSubscription || item.subscription) || []
          }
        })
        
        setSubscriptions(subscriptionOrders)
      }
    } catch (error) {
      console.error("Error al cargar suscripciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las suscripciones",
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => ({ ...prev, subscriptions: false }))
    }
  }

  const fetchPaymentMethods = async () => {
    if (!user) return
    try {
      setLoadingStates(prev => ({ ...prev, payments: true }))
      
      // Por ahora, simulamos métodos de pago basados en órdenes completadas
      // En el futuro, esto se conectará a una tabla real de métodos de pago
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
        .eq("payment_status", "completed")
        .limit(1)

      if (error) throw error

      // Si el usuario tiene órdenes completadas, simular que tiene un método de pago
      if (orderData && orderData.length > 0) {
        const simulatedPaymentMethods = [{
          id: `pm_${user.id}_default`,
          user_id: user.id,
          card_brand: "visa",
          card_last_four: "****",
          cardholder_name: user.email?.split('@')[0] || "Usuario",
          card_exp_month: 12,
          card_exp_year: 2025,
          is_default: true,
          is_active: true,
          is_test: true,
          created_at: new Date().toISOString()
        }]
        setPaymentMethods(simulatedPaymentMethods)
      } else {
        setPaymentMethods([])
      }
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error)
      setPaymentMethods([])
    } finally {
      setLoadingStates(prev => ({ ...prev, payments: false }))
    }
  }

  const fetchBillingHistory = async () => {
    if (!user) return
    try {
      setLoadingStates(prev => ({ ...prev, billing: true }))
      
      // Obtener órdenes completadas como historial de facturación
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
        .in("payment_status", ["completed", "processing"])
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      
      // Procesar los datos para el historial de facturación
      const processedBilling = (data || []).map(order => {
        let orderData = null
        if (order.shipping_address) {
          try {
            orderData = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
          } catch (e) {
            console.error('Error parsing shipping_address:', e)
          }
        }
        
        return {
          id: order.id,
          billing_date: order.created_at,
          amount: order.total,
          status: order.payment_status,
          order_number: orderData?.order_number || `PG-${order.id}`,
          items: orderData?.items || [],
          customer_data: orderData?.customer_data || {}
        }
      })
      
      setBillingHistory(processedBilling)
    } catch (error) {
      console.error("Error al cargar historial de facturación:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de facturación",
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => ({ ...prev, billing: false }))
    }
  }

  const fetchOrders = async () => {
    if (!user) return
    try {
      setLoadingStates(prev => ({ ...prev, orders: true }))
      
      // Obtener todas las órdenes y filtrar por email del usuario en el lado cliente
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      // Procesar órdenes
      const processedOrders = (data || []).map(order => {
        let orderData = null
        if (order.shipping_address) {
          try {
            orderData = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
          } catch (e) {
            console.error('Error parsing shipping_address:', e)
          }
        }
        
        return {
          ...order,
          orderData,
          customer_name: orderData?.customer_data?.full_name || orderData?.customer_data?.name || user?.email || "Cliente",
          items: orderData?.items || []
        }
      })
      
      setOrders(processedOrders)
    } catch (error) {
      console.error("Error al cargar órdenes:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las compras",
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => ({ ...prev, orders: false }))
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    
    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          postal_code: profile.postal_code,
          country: profile.country,
          birth_date: profile.birth_date,
          avatar_url: profile.avatar_url
        }
      })

      if (error) throw error

      setIsEditing(false)
      toast({
        title: "Perfil actualizado",
        description: "Tu información personal ha sido guardada exitosamente",
      })
    } catch (error) {
      console.error("Error guardando perfil:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null)
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Requerido</CardTitle>
            <CardDescription className="text-center">
              Debes iniciar sesión para ver tu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">
                Gestiona tu información personal y preferencias
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {profile?.email}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs Principal */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Suscripciones</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Facturas</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Contenido Personal */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                    <CardDescription>
                      Actualiza tus datos personales y de contacto
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? "destructive" : "outline"}
                    onClick={() => {
                      if (isEditing) {
                        // Cancelar edición
                        setIsEditing(false)
                        // Recargar datos originales si es necesario
                      } else {
                        setIsEditing(true)
                      }
                    }}
                  >
                    {isEditing ? "Cancelar" : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre completo</Label>
                    <Input
                      id="full_name"
                      value={profile?.full_name || ''}
                      onChange={(e) => updateProfileField('full_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      El email no se puede cambiar
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ''}
                      onChange={(e) => updateProfileField('phone', e.target.value)}
                      disabled={!isEditing}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={profile?.birth_date || ''}
                      onChange={(e) => updateProfileField('birth_date', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Dirección</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Textarea
                        id="address"
                        value={profile?.address || ''}
                        onChange={(e) => updateProfileField('address', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Calle, número, colonia..."
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                          id="city"
                          value={profile?.city || ''}
                          onChange={(e) => updateProfileField('city', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={profile?.state || ''}
                          onChange={(e) => updateProfileField('state', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Código Postal</Label>
                        <Input
                          id="postal_code"
                          value={profile?.postal_code || ''}
                          onChange={(e) => updateProfileField('postal_code', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido Suscripciones */}
          <TabsContent value="subscriptions">
            <Card>
              <CardContent className="p-6">
                <UserSubscriptions userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido Métodos de Pago */}
          <TabsContent value="payments">
            <Card>
              <CardContent className="p-6">
                <UserPaymentMethods userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido Historial de Facturación */}
          <TabsContent value="billing">
            <Card>
              <CardContent className="p-6">
                <UserBillingHistory userId={user.id} userEmail={user.email} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido Compras */}
          <TabsContent value="purchases">
            <Card>
              <CardContent className="p-6">
                <UserPurchases userId={user.id} userEmail={user.email} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenido Configuración */}
          <TabsContent value="settings">
            <Card>
              <CardContent className="p-6">
                <UserConfiguration userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
