# Análisis y Migración de checkout-modal.tsx a Stripe

## Estado Actual (MercadoPago)

El archivo `components/checkout-modal.tsx` contiene **1400+ líneas** de código complejo para manejar pagos y suscripciones con MercadoPago.

### Referencias a MercadoPago Encontradas

1. **URLs de suscripción en tipos** (líneas 54-56):
   - `monthly_mercadopago_url`
   - `quarterly_mercadopago_url`
   - `annual_mercadopago_url`

2. **Función `getProductSpecificUrl`** (líneas 267-281):
   - Retorna URLs específicas de MercadoPago según tipo de suscripción

3. **Lógica de creación de preferencias** (líneas 902+):
   - `fetch('/api/mercadopago/create-preference')`
   - Manejo de `init_point` para redirección

4. **Campos en subscriptionData** (líneas 714-722):
   - `collector_id` - ID de MercadoPago
   - `application_id` - ID de MercadoPago
   - `init_point` - URL de checkout de MercadoPago
   - `mercadopago_subscription_id` - ID de suscripción de MercadoPago

5. **Comentarios y mensajes** (múltiples líneas):
   - Referencias a "Mercado Pago", "MercadoPago"

## Problemas Identificados

### 1. **Complejidad Excesiva**
- El archivo mezcla:
  - Validaciones de formulario
  - Lógica de negocio de suscripciones
  - Detección y limpieza de duplicados
  - Integración con MercadoPago
  - Manejo de estados de UI
  
### 2. **Acoplamiento Fuerte**
- Lógica de pagos directamente en el componente de UI
- Difícil de testear y mantener
- No reutilizable

### 3. **Código Duplicado**
- Validaciones repetidas
- Lógica de suscripciones mezclada con pagos únicos

## Recomendaciones para Migración a Stripe

### Opción 1: Simplificación Radical ✅ RECOMENDADA

**Ventajas:**
- Código más limpio y mantenible
- Separación de responsabilidades
- Más fácil de testear
- Mejor experiencia de usuario

**Pasos:**

1. **Crear archivo simplificado** `components/checkout-modal-simple.tsx`:
   - Solo formulario y validaciones
   - Delegar lógica de pago a servicios
   - ~300-400 líneas de código

2. **Crear servicio de Stripe** `lib/stripe/checkout-service.ts`:
   ```typescript
   export class StripeCheckoutService {
     // Crear sesión de checkout para compra única
     async createCheckoutSession(items, customerInfo, shippingInfo) {}
     
     // Crear suscripción de Stripe
     async createSubscription(planId, customerId, metadata) {}
     
     // Validar y verificar sesión
     async verifySession(sessionId) {}
   }
   ```

3. **Crear endpoint API** `app/api/stripe/create-checkout/route.ts`:
   - Maneja la creación de Checkout Session
   - Separa lógica de UI

4. **Eliminar código legacy**:
   - Remover toda lógica de MercadoPago
   - Eliminar funciones `getProductSpecificUrl`, etc.
   - Simplificar manejo de suscripciones

### Opción 2: Migración Gradual (NO RECOMENDADA)

Mantener código de MercadoPago y agregar Stripe en paralelo. 

**Desventajas:**
- Código aún más complejo
- Más difícil de mantener
- Riesgo de bugs

## Plan de Implementación Recomendado

### Fase 1: Limpieza (AHORA)
- [x] Crear backup del archivo actual
- [ ] Eliminar todas las referencias a MercadoPago
- [ ] Crear versión simplificada del modal
- [ ] Actualizar tipos e interfaces

### Fase 2: Infraestructura Stripe
- [ ] Instalar `@stripe/stripe-js` y `stripe`
- [ ] Configurar variables de entorno de Stripe
- [ ] Crear servicio base de Stripe
- [ ] Crear endpoints API necesarios

### Fase 3: Implementación
- [ ] Implementar checkout para compras únicas
- [ ] Implementar checkout para suscripciones
- [ ] Configurar webhooks de Stripe
- [ ] Actualizar base de datos (campos de Stripe)

### Fase 4: Testing y Deploy
- [ ] Testing en ambiente de pruebas
- [ ] Migración de datos existentes (si aplica)
- [ ] Deploy a producción
- [ ] Monitoreo y ajustes

## Código Simplificado Propuesto

### components/checkout-modal-simple.tsx

```typescript
"use client"

import { useState } from "react"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { OrderSummary } from "@/components/checkout/order-summary"
import { createStripeCheckout } from "@/lib/stripe/checkout-service"

export function CheckoutModal() {
  const { cart, setShowCheckout, showCheckout } = useCart()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    
    try {
      const { url } = await createStripeCheckout({
        items: cart,
        customer: formData,
        successUrl: `${window.location.origin}/gracias-por-tu-compra`,
        cancelUrl: `${window.location.origin}/checkout`
      })
      
      window.location.href = url
    } catch (error) {
      console.error(error)
      // Manejar error
    } finally {
      setIsLoading(false)
    }
  }

  if (!showCheckout) return null

  return (
    <div className="modal">
      <CheckoutForm onSubmit={handleSubmit} isLoading={isLoading} />
      <OrderSummary items={cart} />
    </div>
  )
}
```

### lib/stripe/checkout-service.ts

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia'
})

export async function createStripeCheckout(params: {
  items: CartItem[]
  customer: CustomerInfo
  successUrl: string
  cancelUrl: string
}) {
  // Detectar si es suscripción
  const hasSubscription = params.items.some(item => item.isSubscription)
  
  if (hasSubscription) {
    return createSubscriptionCheckout(params)
  } else {
    return createOneTimeCheckout(params)
  }
}

async function createOneTimeCheckout(params) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: params.items.map(item => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          name: item.name,
          images: [item.image]
        },
        unit_amount: item.price * 100
      },
      quantity: item.quantity
    })),
    customer_email: params.customer.email,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.customer.userId
    }
  })
  
  return { url: session.url }
}

async function createSubscriptionCheckout(params) {
  // Similar pero con mode: 'subscription'
  // ...
}
```

## Campos de Base de Datos a Actualizar

### Tabla: unified_subscriptions

**Eliminar (MercadoPago):**
- `mercadopago_subscription_id`
- `mercadopago_plan_id` (ya comentado)
- `collector_id`
- `application_id`
- `init_point`

**Agregar (Stripe):**
- `stripe_subscription_id` (varchar)
- `stripe_customer_id` (varchar)
- `stripe_price_id` (varchar)
- `stripe_payment_intent_id` (varchar)

### Tabla: orders

**Agregar:**
- `stripe_session_id` (varchar)
- `stripe_payment_intent_id` (varchar)

## Ventajas de la Simplificación

1. **Menos código** - De 1400 a ~300 líneas en el modal
2. **Más mantenible** - Lógica separada en servicios
3. **Más testeable** - Funciones puras y separadas
4. **Mejor UX** - Checkout más rápido con Stripe
5. **Mejor DX** - Código más fácil de entender

## Próximos Pasos

1. **Revisar este documento** con el equipo
2. **Decidir enfoque** (simplificación vs migración gradual)
3. **Configurar Stripe** (cuenta, keys, webhooks)
4. **Implementar versión simplificada** del modal
5. **Testear** en ambiente de desarrollo
6. **Deploy** gradual a producción

## Notas Importantes

- ⚠️ El archivo actual tiene **múltiples responsabilidades** - necesita refactoring
- ⚠️ La lógica de deduplicación de suscripciones debe moverse a un servicio
- ⚠️ Las validaciones de formulario pueden ser un hook reutilizable
- ✅ Stripe tiene mejor documentación y SDK que MercadoPago
- ✅ Stripe maneja automáticamente muchos casos edge que ahora manejamos manualmente

## Referencias

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
