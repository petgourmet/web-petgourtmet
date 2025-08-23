'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'

interface OrderDiagnosis {
  orderId: number
  status: string
  paymentStatus: string
  mercadopagoPaymentId: string | null
  paymentIntentId: string | null
  externalReference: string | null
  customerEmail: string
  total: number
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
  issues: Array<{
    type: string
    severity: string
    description: string
    impact: string
  }>
  recommendations: Array<{
    action: string
    description: string
    priority: string
    paymentData?: {
      id: number
      status: string
      amount: number
      dateCreated: string
    }
  }>
}

interface SyncResult {
  success: boolean
  message: string
  orderId: number
  syncResult?: {
    paymentId: number
    paymentStatus: string
    orderStatus: string
    amount: number
    paymentMethod: string
    dateCreated: string
    totalPaymentsFound: number
  }
}

export default function PaymentManagementPage() {
  const [orderId, setOrderId] = useState('')
  const [diagnosis, setDiagnosis] = useState<OrderDiagnosis | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mercadopagoSearch, setMercadopagoSearch] = useState<any>(null)

  const diagnosisOrder = async () => {
    if (!orderId) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un ID de orden',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/debug/order-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: parseInt(orderId) })
      })

      const data = await response.json()
      
      if (data.success) {
        setDiagnosis(data.diagnosis)
        setMercadopagoSearch(data.mercadopagoSearch)
        toast({
          title: 'Diagnóstico completado',
          description: `Se encontraron ${data.diagnosis.issues.length} problemas`
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error al diagnosticar la orden',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncOrder = async (forceSync = false) => {
    if (!orderId) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un ID de orden',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/sync-order-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          orderId: parseInt(orderId),
          forceSync 
        })
      })

      const data = await response.json()
      setSyncResult(data)
      
      if (data.success) {
        toast({
          title: 'Sincronización exitosa',
          description: data.message
        })
        // Actualizar diagnóstico después de la sincronización
        setTimeout(() => diagnosisOrder(), 1000)
      } else {
        toast({
          title: 'Error en sincronización',
          description: data.message || 'Error al sincronizar la orden',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default'
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'pending_payment': return 'secondary'
      case 'cancelled': return 'destructive'
      case 'refunded': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Diagnostica y sincroniza órdenes con problemas de pago
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Orden</CardTitle>
          <CardDescription>
            Ingresa el ID de la orden para diagnosticar problemas de pago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="ID de la orden (ej: 148)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              type="number"
            />
            <Button 
              onClick={diagnosisOrder} 
              disabled={isLoading}
            >
              {isLoading ? 'Diagnosticando...' : 'Diagnosticar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {diagnosis && (
        <Tabs defaultValue="diagnosis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger>
            <TabsTrigger value="mercadopago">MercadoPago</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnosis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Orden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID</p>
                    <p className="text-lg font-semibold">{diagnosis.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant={getStatusColor(diagnosis.status)}>
                      {diagnosis.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado de Pago</p>
                    <Badge variant={getStatusColor(diagnosis.paymentStatus)}>
                      {diagnosis.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">${diagnosis.total}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email del Cliente</p>
                    <p>{diagnosis.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment ID</p>
                    <p>{diagnosis.mercadopagoPaymentId || 'No asignado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {diagnosis.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Problemas Detectados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diagnosis.issues.map((issue, index) => (
                    <Alert key={index}>
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              <span className="font-medium">{issue.type}</span>
                            </div>
                            <p className="text-sm">{issue.description}</p>
                            <p className="text-xs text-muted-foreground">{issue.impact}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

            {diagnosis.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diagnosis.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                              <span className="font-medium">{rec.action}</span>
                            </div>
                            <p className="text-sm">{rec.description}</p>
                            {rec.paymentData && (
                              <div className="text-xs text-muted-foreground mt-2">
                                <p>Payment ID: {rec.paymentData.id}</p>
                                <p>Estado: {rec.paymentData.status}</p>
                                <p>Monto: ${rec.paymentData.amount}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="mercadopago" className="space-y-4">
            {mercadopagoSearch && (
              <Card>
                <CardHeader>
                  <CardTitle>Búsqueda en MercadoPago</CardTitle>
                </CardHeader>
                <CardContent>
                  {mercadopagoSearch.found ? (
                    <div className="space-y-4">
                      <p className="text-green-600 font-medium">
                        ✅ Se encontraron {mercadopagoSearch.totalFound} pago(s)
                      </p>
                      {mercadopagoSearch.payments.map((payment: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Payment ID</p>
                              <p className="font-mono">{payment.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Estado</p>
                              <Badge variant={getStatusColor(payment.status)}>
                                {payment.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Monto</p>
                              <p>${payment.transaction_amount}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Método</p>
                              <p>{payment.payment_method_id}</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>Creado: {new Date(payment.date_created).toLocaleString()}</p>
                            <p>External Reference: {payment.external_reference}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-600">❌ No se encontraron pagos en MercadoPago</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acciones de Sincronización</CardTitle>
                <CardDescription>
                  Sincroniza manualmente la orden con los datos de MercadoPago
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={() => syncOrder(false)}
                    disabled={isLoading}
                    variant="default"
                  >
                    {isLoading ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                  <Button 
                    onClick={() => syncOrder(true)}
                    disabled={isLoading}
                    variant="destructive"
                  >
                    {isLoading ? 'Sincronizando...' : 'Forzar Sincronización'}
                  </Button>
                </div>
                
                {syncResult && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className={syncResult.success ? 'text-green-600' : 'text-red-600'}>
                          {syncResult.success ? '✅' : '❌'} {syncResult.message}
                        </p>
                        {syncResult.syncResult && (
                          <div className="text-sm space-y-1">
                            <p>Payment ID: {syncResult.syncResult.paymentId}</p>
                            <p>Estado del Pago: {syncResult.syncResult.paymentStatus}</p>
                            <p>Estado de la Orden: {syncResult.syncResult.orderStatus}</p>
                            <p>Monto: ${syncResult.syncResult.amount}</p>
                            <p>Método: {syncResult.syncResult.paymentMethod}</p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}