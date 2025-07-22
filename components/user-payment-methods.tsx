'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle, Star } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentMethod {
  id: string
  user_id: string
  card_brand: string
  card_last_four: string
  cardholder_name: string
  card_exp_month: number
  card_exp_year: number
  is_default: boolean
  is_active: boolean
  is_test: boolean
  created_at: string
  updated_at?: string
}

interface UserPaymentMethodsProps {
  userId: string
}

export default function UserPaymentMethods({ userId }: UserPaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingMethod, setUpdatingMethod] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchPaymentMethods()
    }
  }, [userId])

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payment-methods/user/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setPaymentMethods(result.payment_methods || [])
      } else {
        console.warn('No se pudieron cargar métodos de pago')
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    setUpdatingMethod(methodId)

    try {
      const response = await fetch(`/api/payment-methods/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: methodId,
          action: 'set_default'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Actualizar métodos de pago localmente
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === methodId 
              ? { ...method, is_default: true }
              : { ...method, is_default: false }
          )
        )
        toast.success('Método de pago predeterminado actualizado')
      } else {
        throw new Error(result.error || 'Error actualizando método de pago')
      }
    } catch (error) {
      console.error('Error updating payment method:', error)
      toast.error('Error al actualizar método de pago')
    } finally {
      setUpdatingMethod(null)
    }
  }

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este método de pago?')) {
      return
    }

    setUpdatingMethod(methodId)

    try {
      const response = await fetch(`/api/payment-methods/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: methodId
        })
      })

      const result = await response.json()

      if (result.success) {
        setPaymentMethods(prev => prev.filter(method => method.id !== methodId))
        toast.success('Método de pago eliminado')
      } else {
        throw new Error(result.error || 'Error eliminando método de pago')
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      toast.error('Error al eliminar método de pago')
    } finally {
      setUpdatingMethod(null)
    }
  }

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase()
    
    if (brandLower.includes('visa')) {
      return '💳'
    } else if (brandLower.includes('master')) {
      return '💳'
    } else if (brandLower.includes('american')) {
      return '💳'
    }
    return '💳'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-24 w-full"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Métodos de Pago
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar Tarjeta
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes métodos de pago guardados
          </h3>
          <p className="text-gray-600 mb-6">
            Agrega una tarjeta de crédito o débito para realizar compras más rápido
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Agregar mi primera tarjeta
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method) => {
            const isUpdating = updatingMethod === method.id
            const isExpired = new Date() > new Date(method.card_exp_year, method.card_exp_month - 1)

            return (
              <div
                key={method.id}
                className={`bg-white rounded-xl shadow-md border-2 p-6 transition-all ${
                  method.is_default 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {getBrandIcon(method.card_brand)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 capitalize">
                          {method.card_brand}
                        </span>
                        <span className="text-gray-600">
                          •••• •••• •••• {method.card_last_four}
                        </span>
                        {method.is_default && (
                          <div className="flex items-center gap-1 text-primary">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs font-medium">Principal</span>
                          </div>
                        )}
                        {method.is_test && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            Prueba
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {method.cardholder_name}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Expira: {String(method.card_exp_month).padStart(2, '0')}/{method.card_exp_year}
                        </span>
                        {isExpired && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Vencida
                          </span>
                        )}
                        {method.is_active && !isExpired && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Activa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.is_default && method.is_active && !isExpired && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        disabled={isUpdating}
                        className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? '...' : 'Usar como principal'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      disabled={isUpdating}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulario para agregar nueva tarjeta */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Agregar Nueva Tarjeta</h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 inline mr-2" />
                Actualmente en modo de demostración. Las tarjetas reales se agregarán en producción.
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    toast.info('Funcionalidad disponible próximamente')
                    setShowAddForm(false)
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
