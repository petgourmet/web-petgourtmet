'use client'

import { useState, useEffect } from 'react'
import SubscriptionPlans from '@/components/subscription-plans'
import UserSubscriptions from '@/components/user-subscriptions'
import { toast } from 'sonner'

export default function TestSubscriptionsPage() {
  const [testUser] = useState({
    id: 'test-user-123',
    email: 'test@petgourmet.mx'
  })

  const [activeTab, setActiveTab] = useState<'plans' | 'user-subs' | 'api-test'>('plans')
  const [plans, setPlans] = useState<any[]>([])
  const [testResults, setTestResults] = useState<any[]>([])

  // Test crear plan
  const testCreatePlan = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Plan Mensual Pet Gourmet',
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 899.99,
          repetitions: 12,
          billing_day_proportional: false
        })
      })

      const result = await response.json()
      setTestResults(prev => [...prev, {
        action: 'Crear Plan',
        status: response.ok ? 'SUCCESS' : 'ERROR',
        data: result
      }])

      if (response.ok) {
        toast.success('Plan creado exitosamente')
      } else {
        toast.error('Error creando plan: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  // Test obtener planes
  const testGetPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans')
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        action: 'Obtener Planes',
        status: response.ok ? 'SUCCESS' : 'ERROR',
        data: result
      }])

      if (response.ok) {
        setPlans(result.plans || [])
        toast.success(`${result.plans?.length || 0} planes encontrados`)
      } else {
        toast.error('Error obteniendo planes: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  // Test crear suscripción
  const testCreateSubscription = async () => {
    if (plans.length === 0) {
      toast.error('Primero crea un plan')
      return
    }

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preapproval_plan_id: plans[0]?.id,
          reason: 'Suscripción Test Pet Gourmet',
          external_reference: `TEST-${Date.now()}`,
          payer_email: testUser.email,
          user_id: testUser.id,
          product_id: 1,
          quantity: 1,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            transaction_amount: 899.99,
            currency_id: 'MXN'
          }
        })
      })

      const result = await response.json()
      setTestResults(prev => [...prev, {
        action: 'Crear Suscripción',
        status: response.ok ? 'SUCCESS' : 'ERROR',
        data: result
      }])

      if (response.ok) {
        toast.success('Suscripción creada exitosamente')
      } else {
        toast.error('Error creando suscripción: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  // Test obtener suscripciones de usuario
  const testGetUserSubscriptions = async () => {
    try {
      const response = await fetch(`/api/subscriptions/user/${testUser.id}`)
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        action: 'Obtener Suscripciones Usuario',
        status: response.ok ? 'SUCCESS' : 'ERROR',
        data: result
      }])

      if (response.ok) {
        toast.success(`${result.subscriptions?.length || 0} suscripciones encontradas`)
      } else {
        toast.error('Error obteniendo suscripciones: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          🧪 Test de Suscripciones Pet Gourmet
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'plans'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Planes de Suscripción
            </button>
            <button
              onClick={() => setActiveTab('user-subs')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'user-subs'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Suscripciones Usuario
            </button>
            <button
              onClick={() => setActiveTab('api-test')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'api-test'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Test APIs
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'plans' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Planes de Suscripción</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Prueba los componentes de suscripción con datos simulados
              </p>
            </div>
            
            <SubscriptionPlans
              productId={1}
              productName="Comida Premium para Perros"
              basePrice={899.99}
              userEmail={testUser.email}
              userId={testUser.id}
              onSubscriptionCreated={(subscription) => {
                toast.success('Suscripción creada desde componente')
                console.log('Suscripción creada:', subscription)
              }}
            />
          </div>
        )}

        {activeTab === 'user-subs' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Mis Suscripciones</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Usuario test: {testUser.email}
              </p>
            </div>
            
            <UserSubscriptions
              userId={testUser.id}
            />
          </div>
        )}

        {activeTab === 'api-test' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Test de APIs</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Prueba las APIs de suscripciones directamente
              </p>
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={testCreatePlan}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Crear Plan
              </button>
              
              <button
                onClick={testGetPlans}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Obtener Planes
              </button>
              
              <button
                onClick={testCreateSubscription}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Crear Suscripción
              </button>
              
              <button
                onClick={testGetUserSubscriptions}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Suscripciones
              </button>
            </div>

            {/* Clear Button */}
            {testResults.length > 0 && (
              <div className="text-center">
                <button
                  onClick={clearResults}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Limpiar Resultados
                </button>
              </div>
            )}

            {/* Results */}
            {testResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Resultados de Tests:</h3>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.status === 'SUCCESS'
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{result.action}</h4>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            result.status === 'SUCCESS'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
