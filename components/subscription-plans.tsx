// COMPONENTE OBSOLETO - ELIMINADO
// Este componente manejaba planes de suscripción que ya no se usan
// en el nuevo sistema sin planes asociados

'use client'

import { AlertCircle } from 'lucide-react'

interface SubscriptionPlansProps {
  productId?: number
  productName?: string
  basePrice?: number
  userEmail?: string
  userId?: string
  onSubscriptionCreated?: (subscription: any) => void
}

export default function SubscriptionPlans({
  productId,
  productName = 'Producto Pet Gourmet',
  basePrice = 100,
  userEmail,
  userId,
  onSubscriptionCreated
}: SubscriptionPlansProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <AlertCircle className="h-8 w-8 text-amber-500" />
          <h2 className="text-3xl font-bold text-gray-900">
            Componente Obsoleto
          </h2>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Este componente ha sido eliminado. El nuevo sistema de suscripciones no usa planes asociados.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Use el nuevo sistema de suscripciones sin planes desde el checkout modal.
        </p>
      </div>
    </div>
  )
}
