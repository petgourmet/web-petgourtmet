'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Database, 
  Globe, 
  Mail, 
  Webhook,
  ShoppingCart,
  CreditCard,
  Users,
  Activity,
  Clock
} from 'lucide-react'

interface SystemStatus {
  supabase: 'healthy' | 'error' | 'warning'
  mercadopago: 'healthy' | 'error' | 'warning'
  email: 'healthy' | 'error' | 'warning'
  webhooks: 'healthy' | 'error' | 'warning'
}

interface SystemMetrics {
  totalOrders: number
  successfulPayments: number
  failedPayments: number
  activeSubscriptions: number
  webhooksReceived: number
  avgResponseTime: number
}

interface TestResult {
  name: string
  status: 'passed' | 'failed'
  message: string
  duration: number
}

interface TestResults {
  testType: string
  timestamp: string
  tests: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    success: boolean
  }
}

export default function SystemTestingDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [simulateLoading, setSimulateLoading] = useState(false)

  const fetchSystemStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/testing/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
        setMetrics(data.metrics)
      } else {
        toast.error('Error al obtener el estado del sistema')
      }
    } catch (error) {
      toast.error('Error de conexión al verificar el estado')
    } finally {
      setLoading(false)
    }
  }

  const runTests = async (testType: string) => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/admin/testing/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testType })
      })
      
      if (response.ok) {
        const results = await response.json()
        setTestResults(results)
        toast.success(`Pruebas ${testType} completadas`)
      } else {
        toast.error('Error al ejecutar las pruebas')
      }
    } catch (error) {
      toast.error('Error de conexión al ejecutar pruebas')
    } finally {
      setTestLoading(false)
    }
  }

  const simulatePurchase = async () => {
    setSimulateLoading(true)
    try {
      const response = await fetch('/api/admin/testing/simulate-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: 'test-product',
          amount: 1500,
          userEmail: 'test@petgourmet.com'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Compra de prueba creada exitosamente')
        // Refrescar métricas después de 3 segundos
        setTimeout(() => {
          fetchSystemStatus()
        }, 3000)
      } else {
        toast.error('Error al simular compra')
      }
    } catch (error) {
      toast.error('Error de conexión al simular compra')
    } finally {
      setSimulateLoading(false)
    }
  }

  const simulateSubscription = async () => {
    setSimulateLoading(true)
    try {
      const response = await fetch('/api/admin/testing/simulate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: 'test-plan',
          amount: 2500,
          userEmail: 'test@petgourmet.com',
          frequency: 'monthly'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Suscripción de prueba creada exitosamente')
        // Refrescar métricas después de 4 segundos
        setTimeout(() => {
          fetchSystemStatus()
        }, 4000)
      } else {
        toast.error('Error al simular suscripción')
      }
    } catch (error) {
      toast.error('Error de conexión al simular suscripción')
    } finally {
      setSimulateLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemStatus()
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Saludable</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Advertencia</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Testing</h1>
          <p className="text-muted-foreground">
            Monitorea el estado del sistema y ejecuta pruebas de validación
          </p>
        </div>
        <Button onClick={fetchSystemStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estado de Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supabase</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status && getStatusIcon(status.supabase)}
              {status && getStatusBadge(status.supabase)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MercadoPago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status && getStatusIcon(status.mercadopago)}
              {status && getStatusBadge(status.mercadopago)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Service</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status && getStatusIcon(status.email)}
              {status && getStatusBadge(status.email)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status && getStatusIcon(status.webhooks)}
              {status && getStatusBadge(status.webhooks)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas del Sistema */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Exitosos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.successfulPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Fallidos</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failedPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webhooks (24h)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.webhooksReceived}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Respuesta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles de Pruebas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pruebas Automáticas */}
        <Card>
          <CardHeader>
            <CardTitle>Pruebas Automáticas</CardTitle>
            <CardDescription>
              Ejecuta pruebas automáticas para validar el funcionamiento del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => runTests('database')} 
                disabled={testLoading}
                variant="outline"
              >
                <Database className="h-4 w-4 mr-2" />
                Base de Datos
              </Button>
              <Button 
                onClick={() => runTests('api')} 
                disabled={testLoading}
                variant="outline"
              >
                <Globe className="h-4 w-4 mr-2" />
                APIs
              </Button>
              <Button 
                onClick={() => runTests('webhooks')} 
                disabled={testLoading}
                variant="outline"
              >
                <Webhook className="h-4 w-4 mr-2" />
                Webhooks
              </Button>
              <Button 
                onClick={() => runTests('email')} 
                disabled={testLoading}
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
            <Button 
              onClick={() => runTests('all')} 
              disabled={testLoading}
              className="w-full"
            >
              <Play className={`h-4 w-4 mr-2 ${testLoading ? 'animate-spin' : ''}`} />
              Ejecutar Todas las Pruebas
            </Button>
          </CardContent>
        </Card>

        {/* Simulaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Simulaciones de Prueba</CardTitle>
            <CardDescription>
              Simula compras y suscripciones para validar el flujo completo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={simulatePurchase} 
              disabled={simulateLoading}
              variant="outline"
              className="w-full"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Simular Compra de Prueba
            </Button>
            <Button 
              onClick={simulateSubscription} 
              disabled={simulateLoading}
              variant="outline"
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Simular Suscripción de Prueba
            </Button>
            {simulateLoading && (
              <p className="text-sm text-muted-foreground text-center">
                Procesando simulación...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resultados de Pruebas */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Pruebas</CardTitle>
            <CardDescription>
              Última ejecución: {new Date(testResults.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge 
                  variant={testResults.summary.success ? "default" : "destructive"}
                  className={testResults.summary.success ? "bg-green-500" : ""}
                >
                  {testResults.summary.success ? 'Todas las pruebas pasaron' : 'Algunas pruebas fallaron'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {testResults.summary.passed}/{testResults.summary.total} pruebas exitosas
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                {testResults.tests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center space-x-2">
                      {test.status === 'passed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{test.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{test.duration}ms</span>
                      <Badge variant={test.status === 'passed' ? "default" : "destructive"}>
                        {test.status === 'passed' ? 'Pasó' : 'Falló'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}