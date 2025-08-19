'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  Shield,
  Calendar,
  DollarSign,
  User,
  Package
} from 'lucide-react'

interface SubscriptionValidatorProps {
  isAdmin?: boolean
  userId?: string
}

interface ValidationResult {
  id: string
  type: 'active' | 'pending'
  status: string
  product_name: string
  user_email?: string
  created_at: string
  next_billing_date?: string
  mercadopago_subscription_id?: string
  external_reference?: string
  validation_status: 'valid' | 'invalid' | 'warning' | 'pending_validation'
  validation_message: string
  source: 'user_subscriptions' | 'pending_subscriptions'
}

export default function SubscriptionValidator({ isAdmin = false, userId }: SubscriptionValidatorProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidation, setLastValidation] = useState<Date | null>(null)

  const validateSubscriptions = async () => {
    setIsValidating(true)
    try {
      const supabase = createClient()
      const results: ValidationResult[] = []

      // Construir filtros según el tipo de usuario
      const userFilter = isAdmin ? {} : { user_id: userId }

      // 1. Validar suscripciones activas
      const { data: activeSubscriptions, error: activeError } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          product_id,
          status,
          subscription_type,
          next_billing_date,
          created_at,
          mercadopago_subscription_id,
          external_reference,
          products (name),
          profiles (email)
        `)
        .match(userFilter)
        .order('created_at', { ascending: false })

      if (activeError) {
        console.error('Error validating active subscriptions:', activeError)
        toast.error('Error al validar suscripciones activas')
      } else {
        activeSubscriptions?.forEach(sub => {
          let validationStatus: ValidationResult['validation_status'] = 'valid'
          let validationMessage = 'Suscripción activa válida'

          // Validaciones específicas
          if (!sub.mercadopago_subscription_id) {
            validationStatus = 'warning'
            validationMessage = 'Sin ID de MercadoPago - Verificar vinculación'
          } else if (sub.status !== 'active') {
            validationStatus = 'invalid'
            validationMessage = `Estado inválido: ${sub.status}`
          } else if (sub.next_billing_date) {
            const nextBilling = new Date(sub.next_billing_date)
            const now = new Date()
            if (nextBilling < now) {
              validationStatus = 'warning'
              validationMessage = 'Fecha de facturación vencida'
            }
          }

          results.push({
            id: sub.id,
            type: 'active',
            status: sub.status,
            product_name: sub.products?.name || 'Producto no encontrado',
            user_email: sub.profiles?.email,
            created_at: sub.created_at,
            next_billing_date: sub.next_billing_date,
            mercadopago_subscription_id: sub.mercadopago_subscription_id,
            external_reference: sub.external_reference,
            validation_status: validationStatus,
            validation_message: validationMessage,
            source: 'user_subscriptions'
          })
        })
      }

      // 2. Validar suscripciones pendientes
      const { data: pendingSubscriptions, error: pendingError } = await supabase
        .from('pending_subscriptions')
        .select(`
          id,
          user_id,
          status,
          subscription_type,
          created_at,
          external_reference,
          mercadopago_subscription_id,
          customer_data,
          cart_items,
          processed_at,
          profiles (email)
        `)
        .match(userFilter)
        .order('created_at', { ascending: false })

      if (pendingError) {
        console.error('Error validating pending subscriptions:', pendingError)
        toast.error('Error al validar suscripciones pendientes')
      } else {
        pendingSubscriptions?.forEach(sub => {
          let validationStatus: ValidationResult['validation_status'] = 'pending_validation'
          let validationMessage = 'Suscripción pendiente de procesamiento'

          // Validaciones específicas para pendientes
          const createdAt = new Date(sub.created_at)
          const now = new Date()
          const minutesDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60)

          if (sub.processed_at) {
            validationStatus = 'valid'
            validationMessage = 'Suscripción procesada correctamente'
          } else if (minutesDiff > 30) {
            validationStatus = 'warning'
            validationMessage = 'Suscripción pendiente por más de 30 minutos'
          } else if (sub.status === 'completed') {
            validationStatus = 'valid'
            validationMessage = 'Suscripción completada'
          } else if (sub.status === 'failed') {
            validationStatus = 'invalid'
            validationMessage = 'Suscripción falló en el procesamiento'
          }

          const productName = sub.cart_items?.[0]?.name || 
                             sub.cart_items?.[0]?.product_name || 
                             'Producto no especificado'

          results.push({
            id: `pending_${sub.id}`,
            type: 'pending',
            status: sub.status,
            product_name: productName,
            user_email: sub.profiles?.email || sub.customer_data?.email,
            created_at: sub.created_at,
            mercadopago_subscription_id: sub.mercadopago_subscription_id,
            external_reference: sub.external_reference,
            validation_status: validationStatus,
            validation_message: validationMessage,
            source: 'pending_subscriptions'
          })
        })
      }

      setValidationResults(results)
      setLastValidation(new Date())
      
      // Mostrar resumen
      const validCount = results.filter(r => r.validation_status === 'valid').length
      const warningCount = results.filter(r => r.validation_status === 'warning').length
      const invalidCount = results.filter(r => r.validation_status === 'invalid').length
      const pendingCount = results.filter(r => r.validation_status === 'pending_validation').length

      toast.success(`Validación completada: ${validCount} válidas, ${warningCount} advertencias, ${invalidCount} inválidas, ${pendingCount} pendientes`)

    } catch (error) {
      console.error('Error during validation:', error)
      toast.error('Error durante la validación')
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusIcon = (status: ValidationResult['validation_status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending_validation':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: ValidationResult['validation_status']) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">✅ Válida</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ Advertencia</Badge>
      case 'invalid':
        return <Badge className="bg-red-100 text-red-800">❌ Inválida</Badge>
      case 'pending_validation':
        return <Badge className="bg-blue-100 text-blue-800">⏳ Pendiente</Badge>
      default:
        return <Badge variant="secondary">❓ Desconocido</Badge>
    }
  }

  const getTypeBadge = (type: ValidationResult['type']) => {
    return type === 'active' 
      ? <Badge variant="default">🔄 Activa</Badge>
      : <Badge variant="secondary">⏳ Pendiente</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Validador de Suscripciones
            {isAdmin && <Badge variant="outline">👑 Admin</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastValidation && (
              <span className="text-sm text-gray-500">
                Última validación: {lastValidation.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={validateSubscriptions}
              disabled={isValidating}
              size="sm"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Validar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {validationResults.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Haz clic en "Validar" para verificar el estado de las suscripciones
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.filter(r => r.validation_status === 'valid').length}
                </div>
                <div className="text-sm text-green-600">Válidas</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResults.filter(r => r.validation_status === 'warning').length}
                </div>
                <div className="text-sm text-yellow-600">Advertencias</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {validationResults.filter(r => r.validation_status === 'invalid').length}
                </div>
                <div className="text-sm text-red-600">Inválidas</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.filter(r => r.validation_status === 'pending_validation').length}
                </div>
                <div className="text-sm text-blue-600">Pendientes</div>
              </div>
            </div>

            {/* Lista de resultados */}
            <div className="space-y-3">
              {validationResults.map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(result.validation_status)}
                        <h4 className="font-medium">{result.product_name}</h4>
                        {getTypeBadge(result.type)}
                        {getStatusBadge(result.validation_status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Mensaje:</strong> {result.validation_message}</p>
                        {isAdmin && result.user_email && (
                          <p><strong>Usuario:</strong> {result.user_email}</p>
                        )}
                        <p><strong>Estado:</strong> {result.status}</p>
                        <p><strong>Creada:</strong> {new Date(result.created_at).toLocaleString('es-MX')}</p>
                        {result.next_billing_date && (
                          <p><strong>Próxima facturación:</strong> {new Date(result.next_billing_date).toLocaleDateString('es-MX')}</p>
                        )}
                        {result.mercadopago_subscription_id && (
                          <p><strong>ID MercadoPago:</strong> {result.mercadopago_subscription_id}</p>
                        )}
                        {result.external_reference && (
                          <p><strong>Referencia:</strong> {result.external_reference}</p>
                        )}
                        <p><strong>Fuente:</strong> {result.source}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}