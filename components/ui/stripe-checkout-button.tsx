/**
 * Componente: Botón de Stripe Checkout
 * 
 * Ejemplo de uso del servicio de checkout de Stripe
 * Reemplaza la lógica de MercadoPago en checkout-modal.tsx
 */

'use client'

import { useState } from 'react'

interface StripeCheckoutButtonProps {
  items: Array<{
    id: number
    name: string
    price: number
    quantity: number
    image?: string
    size?: string
    isSubscription?: boolean
    subscriptionType?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'
  }>
  customer: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    userId?: string
  }
  shipping: {
    address: string
    city: string
    state: string
    postalCode: string
    country?: string
  }
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function StripeCheckoutButton({
  items,
  customer,
  shipping,
  onSuccess,
  onError,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      // Validaciones
      if (!items || items.length === 0) {
        throw new Error('El carrito está vacío')
      }

      if (!customer.email) {
        throw new Error('El email es requerido')
      }

      if (!shipping.address) {
        throw new Error('La dirección de envío es requerida')
      }

      // Llamar al API de Stripe
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          customer,
          shipping,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago')
      }

      // Redirigir a Stripe Checkout
      if (data.url) {
        onSuccess?.()
        window.location.href = data.url
      } else {
        throw new Error('No se recibió la URL de checkout')
      }

    } catch (error) {
      console.error('Error en checkout:', error)
      const message = error instanceof Error ? error.message : 'Error desconocido'
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
    >
      {loading ? 'Procesando...' : 'Pagar con Stripe'}
    </button>
  )
}

/**
 * Ejemplo de uso en checkout-modal.tsx:
 * 
 * import { StripeCheckoutButton } from '@/components/ui/stripe-checkout-button'
 * 
 * // Dentro del modal:
 * <StripeCheckoutButton
 *   items={cartItems.map(item => ({
 *     id: item.id,
 *     name: item.name,
 *     price: item.price,
 *     quantity: item.quantity,
 *     image: item.image,
 *     size: item.size,
 *     isSubscription: item.isSubscription,
 *     subscriptionType: item.subscriptionType,
 *   }))}
 *   customer={{
 *     email: formData.email,
 *     firstName: formData.firstName,
 *     lastName: formData.lastName,
 *     phone: formData.phone,
 *     userId: user?.id,
 *   }}
 *   shipping={{
 *     address: formData.address,
 *     city: formData.city,
 *     state: formData.state,
 *     postalCode: formData.postalCode,
 *     country: 'MX',
 *   }}
 *   onSuccess={() => {
 *     console.log('Redirigiendo a Stripe...')
 *   }}
 *   onError={(error) => {
 *     alert(error)
 *   }}
 * />
 */
