# Integración de Stripe en el Checkout

## 📋 Pasos para Integrar Stripe en el Frontend

### 1. Actualizar `checkout-modal.tsx`

Busca la función que maneja el pago (probablemente se llama `handlePayment` o similar) y reemplázala con esto:

```tsx
const handleStripeCheckout = async () => {
  setIsProcessing(true)
  
  try {
    // Preparar items del carrito
    const items = cartItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      size: item.size,
      isSubscription: item.isSubscription,
      subscriptionType: item.subscriptionType,
    }))

    // Preparar datos del cliente
    const customer = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      userId: user?.id,
    }

    // Preparar datos de envío
    const shipping = {
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      country: 'MX',
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
      window.location.href = data.url
    } else {
      throw new Error('No se recibió la URL de checkout')
    }

  } catch (error) {
    console.error('Error en checkout:', error)
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : 'Error al procesar el pago',
      variant: "destructive",
    })
  } finally {
    setIsProcessing(false)
  }
}
```

### 2. Actualizar el Botón de Pago

Reemplaza el botón de MercadoPago con:

```tsx
<Button
  onClick={handleStripeCheckout}
  disabled={isProcessing || !isFormValid()}
  className="w-full"
>
  {isProcessing ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Procesando...
    </>
  ) : (
    <>
      <CreditCard className="mr-2 h-4 w-4" />
      Pagar con Stripe
    </>
  )}
</Button>
```

### 3. Eliminar Referencias a MercadoPago

Busca y elimina:
- Imports de `mercadopago`
- Funciones de MercadoPago
- Lógica de `preference_id`
- Scripts de MercadoPago

---

## 🎯 Cambios Mínimos Necesarios

Si quieres hacer el cambio mínimo posible:

1. **Busca esta línea en checkout-modal.tsx:**
   ```tsx
   // Algo como: const preference = await createPreference(...)
   ```

2. **Reemplázala con:**
   ```tsx
   const response = await fetch('/api/stripe/create-checkout', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ items, customer, shipping }),
   })
   const data = await response.json()
   window.location.href = data.url
   ```

---

## ✅ Para Verificar que Funciona

1. Ve a `/checkout` en tu sitio
2. Agrega productos al carrito
3. Llena el formulario de checkout
4. Click en "Pagar"
5. Deberías ser redirigido a Stripe Checkout
6. Usa la tarjeta de prueba: `4242 4242 4242 4242`

---

## 🔧 Configuración Actual

Ya tienes configurado:
- ✅ Backend Stripe (servicios + API routes)
- ✅ Webhooks funcionando
- ✅ Base de datos actualizada
- ✅ Variables de entorno

Solo falta:
- ⏳ Actualizar checkout-modal.tsx
- ⏳ Eliminar código de MercadoPago

---

¿Quieres que actualice directamente el archivo `checkout-modal.tsx` o prefieres hacerlo tú paso a paso?
