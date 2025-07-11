'use client'

import ProductionCheckout from '@/components/production-checkout'
import { useCart } from '@/components/cart-context'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart } = useCart()

  const handleSuccess = () => {
    // Redirigir a la página de éxito
    // En un caso real, MercadoPago nos redirigirá automáticamente
    router.push('/checkout/success')
  }

  const handleError = (error: any) => {
    console.error('Payment error:', error)
    router.push('/checkout/failure')
  }

  const handlePending = () => {
    router.push('/checkout/pending')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Compra
          </h1>
          <p className="text-gray-600">
            Completa tu información y confirma tu pedido
          </p>
        </div>

        <ProductionCheckout
          onSuccess={handleSuccess}
          onError={handleError}
          onPending={handlePending}
        />
      </div>
    </div>
  )
}
