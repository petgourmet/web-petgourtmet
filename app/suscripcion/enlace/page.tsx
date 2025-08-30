'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import SubscriptionLinkValidator from '@/components/subscription/SubscriptionLinkValidator'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

function SubscriptionLinkPageContent() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const handleValidationComplete = (result: any) => {
    if (result.valid) {
      // Si el enlace es válido, redirigir a la página de confirmación
      // con los parámetros necesarios
      const params = new URLSearchParams({
        external_reference: result.external_reference,
        user_id: result.extracted_user_id,
        from_link: 'true'
      })
      
      router.push(`/suscripcion/confirmacion?${params.toString()}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Validando Enlace de Suscripción
          </h1>
          <p className="text-gray-600">
            Estamos verificando tu enlace de suscripción a Pet Gourmet
          </p>
        </div>

        {/* Validador */}
        <SubscriptionLinkValidator
          onValidationComplete={handleValidationComplete}
          redirectOnSuccess="/suscripcion/confirmacion"
          redirectOnError="/planes"
        />

        {/* Información adicional */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ¿Qué está pasando?
            </h2>
            <div className="space-y-3 text-gray-600">
              <p>
                Estamos validando tu enlace de suscripción para asegurar que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>El enlace es válido y no ha expirado</li>
                <li>Corresponde a tu cuenta de usuario</li>
                <li>No tienes ya una suscripción activa</li>
                <li>Todos los datos son correctos</li>
              </ul>
              <p className="mt-4">
                Una vez validado, serás redirigido automáticamente para completar 
                el proceso de suscripción.
              </p>
            </div>
          </div>

          {/* Información de ayuda */}
          <div className="bg-blue-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ¿Necesitas ayuda?
            </h3>
            <p className="text-blue-800 mb-4">
              Si tienes problemas con tu enlace de suscripción, aquí tienes algunas opciones:
            </p>
            <div className="space-y-2 text-blue-700">
              <p>• Verifica que el enlace esté completo y no se haya cortado</p>
              <p>• Asegúrate de estar usando la cuenta correcta</p>
              <p>• Contacta a nuestro equipo de soporte si el problema persiste</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/contacto')}
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Contactar Soporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando validador...</p>
        </div>
      </div>
    }>
      <SubscriptionLinkPageContent />
    </Suspense>
  )
}