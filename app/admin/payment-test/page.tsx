'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FlowValidationResult {
  timestamp: string
  steps: Array<{
    step: number
    name: string
    status: 'success' | 'error' | 'warning' | 'running'
    details: string
    error?: string
    config?: any
    preferencePreview?: any
  }>
  success: boolean
  errors: string[]
  summary: string
  testOrderId: number | null
}

interface ValidationResult {
  readyForProduction: boolean
  checks: any
  warnings: string[]
  errors: string[]
  recommendations: string[]
}

interface PaymentDiagnostic {
  timestamp: string
  mercadopagoConfig: {
    accessToken: boolean
    webhookSecret: boolean
    publicKey: boolean
  }
  emailConfig: {
    smtpHost: boolean
    smtpUser: boolean
    smtpPass: boolean
    emailFrom: boolean
  }
  orderStatistics: {
    total: number
    byStatus: Record<string, number>
    byPaymentStatus: Record<string, number>
    pendingOlderThan3Days: number
  }
  cristoferTestOrders: any[]
  recommendations: string[]
}

export default function PaymentSystemTestPage() {
  const [diagnostic, setDiagnostic] = useState<PaymentDiagnostic | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [flowValidation, setFlowValidation] = useState<FlowValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testOrderId, setTestOrderId] = useState('')
  const [testPaymentStatus, setTestPaymentStatus] = useState('approved')
  const [testResult, setTestResult] = useState<any>(null)

  const clearResults = () => {
    setDiagnostic(null)
    setValidationResult(null)
    setFlowValidation(null)
    setTestResult(null)
  }

  const validateFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payment-system-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate_flow'
        }),
      })

      if (!response.ok) {
        throw new Error('Error en validación de flujo')
      }

      const result = await response.json()
      setFlowValidation(result)
    } catch (error) {
      console.error('Error validating flow:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateProduction = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payment-system-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate_production'
        }),
      })

      if (!response.ok) {
        throw new Error('Error en validación')
      }

      const result = await response.json()
      setValidationResult(result)
    } catch (error) {
      console.error('Error validating production:', error)
    } finally {
      setLoading(false)
    }
  }

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payment-system-test')
      const data = await response.json()
      
      if (response.ok) {
        setDiagnostic(data.diagnostic)
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Error running diagnostic:', error)
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async () => {
    if (!testOrderId) {
      alert('Por favor ingresa un ID de orden')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/payment-system-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_webhook',
          orderId: testOrderId,
          paymentStatus: testPaymentStatus
        })
      })
      
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error('Error testing webhook:', error)
      setTestResult({ error: 'Error en la prueba' })
    } finally {
      setLoading(false)
    }
  }

  const testAutoCancelPreview = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payment-system-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'auto_cancel_test'
        })
      })
      
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error('Error testing auto cancel:', error)
      setTestResult({ error: 'Error en la prueba' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sistema de Pagos - Diagnóstico y Pruebas</h1>
        <div className="space-x-2">
          <Button onClick={validateFlow} disabled={loading} variant="default">
            {loading ? 'Validando...' : 'Validar Flujo Completo'}
          </Button>
          <Button onClick={validateProduction} disabled={loading} variant="outline">
            {loading ? 'Validando...' : 'Validar Producción'}
          </Button>
          <Button onClick={runDiagnostic} disabled={loading} variant="secondary">
            {loading ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
          </Button>
          <Button onClick={clearResults} variant="ghost" size="sm">
            Limpiar
          </Button>
        </div>
      </div>

      {/* Validación de Flujo Completo */}
      {flowValidation && (
        <Card className={flowValidation.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {flowValidation.success ? '✅' : '❌'} 
              Validación de Flujo Completo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen */}
            <Alert className={flowValidation.success ? 'border-green-500' : 'border-red-500'}>
              <AlertDescription>
                <strong>{flowValidation.summary}</strong>
              </AlertDescription>
            </Alert>

            {/* Pasos del flujo */}
            <div className="space-y-3">
              <h4 className="font-semibold">Pasos de Validación:</h4>
              {flowValidation.steps.map((step, index) => (
                <div key={index} className={`p-3 rounded border-l-4 ${
                  step.status === 'success' ? 'border-green-500 bg-green-50' :
                  step.status === 'error' ? 'border-red-500 bg-red-50' :
                  step.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm">Paso {step.step}</span>
                    <span className="font-medium">{step.name}</span>
                    <Badge variant={
                      step.status === 'success' ? 'default' :
                      step.status === 'error' ? 'destructive' :
                      step.status === 'warning' ? 'secondary' : 'outline'
                    }>
                      {step.status === 'success' ? '✅' :
                       step.status === 'error' ? '❌' :
                       step.status === 'warning' ? '⚠️' : '🔄'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{step.details}</p>
                  {step.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {step.error}</p>
                  )}
                  {step.config && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">Ver configuración</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(step.config, null, 2)}
                      </pre>
                    </details>
                  )}
                  {step.preferencePreview && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">Ver preview de preferencia</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(step.preferencePreview, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Errores generales */}
            {flowValidation.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Errores Encontrados:</h4>
                {flowValidation.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 p-2 rounded text-sm text-red-700">
                    {error}
                  </div>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500">
              Ejecutado: {new Date(flowValidation.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validación de Producción */}
      {validationResult && (
        <Card className={validationResult.readyForProduction ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.readyForProduction ? '✅' : '❌'} 
              Validación para Producción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado general */}
            <Alert className={validationResult.readyForProduction ? 'border-green-500' : 'border-red-500'}>
              <AlertDescription>
                <strong>
                  {validationResult.readyForProduction 
                    ? '🟢 Sistema LISTO para pagos reales en producción' 
                    : '🔴 Sistema NO ESTÁ LISTO para pagos reales'}
                </strong>
              </AlertDescription>
            </Alert>

            {/* Errores críticos */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Errores Críticos:</h4>
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 p-2 rounded text-sm text-red-700">
                    {error}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-600">Advertencias:</h4>
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="bg-yellow-50 p-2 rounded text-sm text-yellow-700">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Recomendaciones */}
            {validationResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">Información:</h4>
                {validationResult.recommendations.map((rec, index) => (
                  <div key={index} className="bg-blue-50 p-2 rounded text-sm text-blue-700">
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Detalles técnicos */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Ver detalles técnicos</summary>
              <div className="mt-2 bg-gray-50 p-3 rounded text-sm">
                <pre>{JSON.stringify(validationResult.checks, null, 2)}</pre>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {diagnostic && (
        <>
          {/* Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración MercadoPago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Access Token:</span>
                  <Badge variant={diagnostic.mercadopagoConfig.accessToken ? 'default' : 'destructive'}>
                    {diagnostic.mercadopagoConfig.accessToken ? '✅ Configurado' : '❌ Faltante'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Webhook Secret:</span>
                  <Badge variant={diagnostic.mercadopagoConfig.webhookSecret ? 'default' : 'secondary'}>
                    {diagnostic.mercadopagoConfig.webhookSecret ? '✅ Configurado' : '⚠️ Opcional'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Public Key:</span>
                  <Badge variant={diagnostic.mercadopagoConfig.publicKey ? 'default' : 'destructive'}>
                    {diagnostic.mercadopagoConfig.publicKey ? '✅ Configurado' : '❌ Faltante'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>SMTP Host:</span>
                  <Badge variant={diagnostic.emailConfig.smtpHost ? 'default' : 'destructive'}>
                    {diagnostic.emailConfig.smtpHost ? '✅ Configurado' : '❌ Faltante'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>SMTP User:</span>
                  <Badge variant={diagnostic.emailConfig.smtpUser ? 'default' : 'destructive'}>
                    {diagnostic.emailConfig.smtpUser ? '✅ Configurado' : '❌ Faltante'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>SMTP Pass:</span>
                  <Badge variant={diagnostic.emailConfig.smtpPass ? 'default' : 'destructive'}>
                    {diagnostic.emailConfig.smtpPass ? '✅ Configurado' : '❌ Faltante'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{diagnostic.orderStatistics.total}</div>
                  <div className="text-sm text-gray-600">Total Órdenes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{diagnostic.orderStatistics.pendingOlderThan3Days}</div>
                  <div className="text-sm text-gray-600">Pendientes +3 días</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{diagnostic.orderStatistics.byStatus.pending || 0}</div>
                  <div className="text-sm text-gray-600">Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{diagnostic.orderStatistics.byStatus.processing || 0}</div>
                  <div className="text-sm text-gray-600">En Proceso</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Por Estado</h4>
                  {Object.entries(diagnostic.orderStatistics.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between py-1">
                      <span className="capitalize">{status}</span>
                      <Badge className={getStatusColor(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Por Estado de Pago</h4>
                  {Object.entries(diagnostic.orderStatistics.byPaymentStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between py-1">
                      <span className="capitalize">{status}</span>
                      <Badge className={getPaymentStatusColor(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Órdenes de Prueba de Cristofer */}
          {diagnostic.cristoferTestOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Órdenes de Prueba (Cristofer)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnostic.cristoferTestOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-mono">#{order.id}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)}>{order.payment_status}</Badge>
                        <span className="text-sm font-semibold">${order.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnostic.recommendations.map((rec, index) => (
                  <Alert key={index} className={rec.includes('❌') ? 'border-red-200' : rec.includes('⚠️') ? 'border-yellow-200' : 'border-green-200'}>
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Herramientas de Prueba */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simular Webhook de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID de Orden</label>
              <Input
                type="text"
                placeholder="Ej: PG1753208318683"
                value={testOrderId}
                onChange={(e) => setTestOrderId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado del Pago</label>
              <select 
                className="w-full p-2 border rounded"
                value={testPaymentStatus}
                onChange={(e) => setTestPaymentStatus(e.target.value)}
              >
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
                <option value="cancelled">Cancelado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
            <Button onClick={testWebhook} disabled={loading} className="w-full">
              Simular Webhook
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview Cancelación Automática</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Ver qué órdenes serían canceladas automáticamente (más de 3 días pendientes).
            </p>
            <Button onClick={testAutoCancelPreview} disabled={loading} className="w-full">
              Ver Órdenes a Cancelar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados de Pruebas */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado de Prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
