# Configuración de Stripe - Guía Completa

## ✅ Completado

### 1. Instalación de Dependencias
```bash
pnpm add @stripe/stripe-js stripe
```

**Versiones instaladas:**
- @stripe/stripe-js: 8.2.0
- stripe: 19.1.0

### 2. Variables de Entorno
Agregadas a `.env`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica
STRIPE_WEBHOOK_SECRET=whsec_tu_secreto_de_webhook
NEXT_PUBLIC_STRIPE_CURRENCY=mxn

# Supabase Service Role Key (necesaria para webhooks)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 3. Archivos Creados

#### Configuración Base
- ✅ `lib/stripe/config.ts` - Configuración de Stripe (API v2025-09-30.clover)

#### Servicios
- ✅ `lib/stripe/checkout-service.ts` - Servicio de checkout con funciones:
  - `createCheckoutSession()` - Crear sesión automática (pago único o suscripción)
  - `createOneTimeCheckoutSession()` - Pago único
  - `createSubscriptionCheckoutSession()` - Suscripciones
  - `getCheckoutSession()` - Recuperar sesión
  - `createCustomerPortalSession()` - Portal de clientes

#### API Routes
- ✅ `app/api/stripe/create-checkout/route.ts` - Endpoint para crear sesiones de checkout
- ✅ `app/api/stripe/webhook/route.ts` - Webhook para recibir eventos de Stripe

#### Componentes
- ✅ `components/ui/stripe-checkout-button.tsx` - Botón de ejemplo para checkout

---

## 🔧 Configuración Pendiente

### 1. Obtener Claves de Stripe

1. **Ir al Dashboard de Stripe:**
   - https://dashboard.stripe.com/test/apikeys

2. **Copiar las claves:**
   - `Publishable key` (pk_test_...)
   - `Secret key` (sk_test_...)

3. **Actualizar `.env`:**
   ```env
   STRIPE_SECRET_KEY=sk_test_tu_clave_real_aqui
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_real_aqui
   ```

### 2. Configurar Webhook

1. **Ir a Webhooks en Stripe:**
   - https://dashboard.stripe.com/test/webhooks

2. **Crear nuevo endpoint:**
   - Click en "Add endpoint"
   - URL: `https://tu-dominio.com/api/stripe/webhook`
   - Seleccionar eventos:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Copiar Signing Secret:**
   - Después de crear el webhook, copiar el "Signing secret" (whsec_...)
   - Actualizar `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_tu_secreto_real_aqui
     ```

### 3. Configurar Supabase Service Role Key

1. **Ir al Dashboard de Supabase:**
   - https://supabase.com/dashboard/project/tu-proyecto/settings/api

2. **Copiar Service Role Key:**
   - En la sección "Project API keys"
   - Copiar "service_role" (NO la "anon" key)

3. **Actualizar `.env`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_real_aqui
   ```

### 4. Actualizar Base de Datos

Ejecutar estos comandos SQL en Supabase:

```sql
-- Agregar columnas de Stripe a la tabla orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session 
ON orders(stripe_session_id);

-- Agregar columnas de Stripe a la tabla unified_subscriptions
ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id 
ON unified_subscriptions(stripe_subscription_id);
```

---

## 📝 Eventos de Webhook Manejados

### checkout.session.completed
- Se dispara cuando se completa un pago o suscripción
- **Pago único:** Crea registro en `orders`
- **Suscripción:** Crea registro en `unified_subscriptions`

### invoice.payment_succeeded
- Se dispara cuando se paga una factura de suscripción
- Actualiza el estado de la suscripción a `active`

### invoice.payment_failed
- Se dispara cuando falla el pago de una suscripción
- Actualiza el estado de la suscripción a `past_due`

### customer.subscription.updated
- Se dispara cuando se actualiza una suscripción
- Actualiza los datos de la suscripción (fechas, estado)

### customer.subscription.deleted
- Se dispara cuando se cancela una suscripción
- Marca la suscripción como `canceled`

---

## 🧪 Testing

### Tarjetas de Prueba

```
Éxito:
4242 4242 4242 4242

Requiere autenticación:
4000 0025 0000 3155

Declinada:
4000 0000 0000 9995

Insuficiente saldo:
4000 0000 0000 9995
```

**Fecha de expiración:** Cualquier fecha futura (ej: 12/34)  
**CVV:** Cualquier 3 dígitos (ej: 123)  
**Código postal:** Cualquiera (ej: 12345)

### Probar Webhook Localmente

1. **Instalar Stripe CLI:**
   ```bash
   # Windows (con Scoop)
   scoop install stripe
   
   # O descargar desde:
   # https://github.com/stripe/stripe-cli/releases
   ```

2. **Login en Stripe:**
   ```bash
   stripe login
   ```

3. **Forwarding de webhooks:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copiar webhook secret:**
   - El CLI mostrará un webhook secret
   - Actualizar `.env` con ese secret temporalmente

5. **Probar eventos:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.payment_succeeded
   ```

---

## 🔄 Próximos Pasos

### 1. Actualizar checkout-modal.tsx
Reemplazar la lógica de MercadoPago con Stripe:

```tsx
import { StripeCheckoutButton } from '@/components/ui/stripe-checkout-button'

// Dentro del modal:
<StripeCheckoutButton
  items={cartItems}
  customer={{
    email: formData.email,
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    userId: user?.id,
  }}
  shipping={{
    address: formData.address,
    city: formData.city,
    state: formData.state,
    postalCode: formData.postalCode,
    country: 'MX',
  }}
  onSuccess={() => console.log('Redirigiendo...')}
  onError={(error) => alert(error)}
/>
```

### 2. Portal de Clientes
Crear página para que usuarios gestionen sus suscripciones:

```tsx
// app/perfil/suscripciones/page.tsx
import { createCustomerPortalSession } from '@/lib/stripe/checkout-service'

async function redirectToPortal(customerId: string) {
  const { url } = await createCustomerPortalSession(customerId)
  window.location.href = url
}
```

### 3. Verificación de Pagos
Crear página de confirmación después del pago:

```tsx
// app/gracias-por-tu-compra/page.tsx
import { getCheckoutSession } from '@/lib/stripe/checkout-service'

export default async function ThankYouPage({ searchParams }: { searchParams: { session_id: string } }) {
  const session = await getCheckoutSession(searchParams.session_id)
  
  // Mostrar detalles del pedido
}
```

---

## 📚 Documentación de Referencia

- [Stripe Checkout - Quickstart](https://docs.stripe.com/checkout/quickstart)
- [Stripe Billing - Quickstart](https://docs.stripe.com/billing/quickstart)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Testing](https://docs.stripe.com/testing)
- [Stripe API Reference](https://docs.stripe.com/api)

---

## ⚠️ Importante

1. **NO compartir las claves secretas:**
   - Nunca subir `.env` al repositorio
   - Usar variables de entorno en producción

2. **Modo de prueba vs Producción:**
   - Claves con `sk_test_` y `pk_test_` son para pruebas
   - Claves con `sk_live_` y `pk_live_` son para producción
   - Usar claves de prueba durante desarrollo

3. **Webhook en producción:**
   - El webhook debe estar en HTTPS
   - Configurar el webhook en el dashboard de producción con la URL real
   - Usar el webhook secret de producción

4. **Service Role Key de Supabase:**
   - Solo usar en servidor (nunca en frontend)
   - Permite operaciones administrativas
   - Necesaria para que el webhook actualice la base de datos
