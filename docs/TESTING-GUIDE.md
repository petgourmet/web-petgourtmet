# 🧪 Guía de Testing - Stripe & PetGourmet

## 🚀 Estado Actual del Proyecto

### ✅ Inicialización Completada
- **Servidor de desarrollo**: Corriendo en `http://localhost:3000`
- **Stripe**: Configurado en modo TEST
- **Balance disponible**: $1,186.14 MXN
- **Clientes existentes**: 5 clientes de prueba

### 🔑 Variables de Entorno Configuradas
```env
STRIPE_SECRET_KEY=sk_test_51S54o1226... (TEST MODE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51S54o1226... (TEST MODE)
STRIPE_WEBHOOK_SECRET=whsec_ce065c9...
NEXT_PUBLIC_STRIPE_CURRENCY=mxn
```

---

## 📋 Comandos de Testing Disponibles

### 1. Verificar Configuración de Stripe
```bash
pnpm stripe:test
```
**Verifica:**
- ✅ Configuración de variables de entorno
- ✅ Conexión con API de Stripe
- ✅ Listado de productos, precios y clientes
- ✅ Estado del webhook secret

### 2. Crear Productos de Prueba
```bash
pnpm stripe:setup
```
**Crea:**
- 📦 Plan Premium Mensual - $799 MXN/mes
- 📦 Plan Premium Anual - $7,670 MXN/año
- 📦 Comida Premium Individual - $499 MXN
- 📦 Snacks Premium - $199 MXN

### 3. Probar Sesión de Checkout
```bash
pnpm stripe:checkout
```
**Genera:**
- 💳 URL de pago de prueba (válida 24h)
- 📋 Información de la sesión
- 💡 Tarjetas de prueba disponibles

### 4. Tests Unitarios
```bash
# Ejecutar todos los tests
pnpm test

# Modo watch
pnpm test:watch

# Con coverage
pnpm test:coverage

# Tests con sandbox
pnpm test:sandbox
```

---

## 💳 Tarjetas de Prueba de Stripe

### ✅ Pago Exitoso
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código Postal: Cualquier código
```

### ❌ Pago Declinado
```
Número: 4000 0000 0000 0002
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

### 🔐 Requiere 3D Secure
```
Número: 4000 0027 6000 3184
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

### 💰 Fondos Insuficientes
```
Número: 4000 0000 0000 9995
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

### 🚫 Tarjeta Vencida
```
Número: 4000 0000 0000 0069
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

**Más tarjetas de prueba:** https://docs.stripe.com/testing#cards

---

## 🔗 Enlaces Útiles del Dashboard

### Stripe Test Dashboard
- **Pagos**: https://dashboard.stripe.com/test/payments
- **Productos**: https://dashboard.stripe.com/test/products
- **Clientes**: https://dashboard.stripe.com/test/customers
- **Suscripciones**: https://dashboard.stripe.com/test/subscriptions
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Logs**: https://dashboard.stripe.com/test/logs
- **API Keys**: https://dashboard.stripe.com/test/apikeys

---

## 🧪 Escenarios de Testing Recomendados

### 1. Testing de Compra Única
```bash
# 1. Crear productos de prueba
pnpm stripe:setup

# 2. Generar URL de checkout
pnpm stripe:checkout

# 3. Abrir URL en navegador
# 4. Completar con tarjeta de prueba exitosa (4242...)
# 5. Verificar en dashboard: https://dashboard.stripe.com/test/payments
```

### 2. Testing de Suscripción
```javascript
// Crear sesión de suscripción desde tu código
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_xxx', // ID del precio mensual/anual
    quantity: 1,
  }],
  success_url: 'http://localhost:3000/suscripcion/exito',
  cancel_url: 'http://localhost:3000/checkout',
})
```

### 3. Testing de Webhooks (Local)
```bash
# 1. Instalar Stripe CLI
# https://docs.stripe.com/stripe-cli#install

# 2. Login
stripe login

# 3. Forward webhooks a local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Obtener webhook signing secret
# El CLI mostrará: whsec_xxx

# 5. Actualizar .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Testing de Pagos Fallidos
```bash
# 1. Generar URL de checkout
pnpm stripe:checkout

# 2. Usar tarjeta declinada: 4000 0000 0000 0002
# 3. Verificar manejo de errores en tu app
# 4. Revisar logs en: https://dashboard.stripe.com/test/logs
```

---

## 📊 Verificación de Integridad

### Checklist de Testing
- [ ] ✅ Stripe conectado correctamente
- [ ] 📦 Productos de prueba creados
- [ ] 💳 Checkout funciona con tarjeta exitosa
- [ ] ❌ Manejo de errores con tarjeta declinada
- [ ] 🔄 Webhooks configurados (si aplica)
- [ ] 📧 Emails de confirmación enviados
- [ ] 💾 Datos guardados en Supabase
- [ ] 🔐 3D Secure funciona correctamente
- [ ] 📱 Responsive en móvil
- [ ] ♿ Accesibilidad verificada

---

## 🐛 Troubleshooting Común

### Error: "STRIPE_SECRET_KEY no está configurada"
```bash
# Verificar que .env.local existe y contiene:
STRIPE_SECRET_KEY=sk_test_...
```

### Error: "Invalid API Key"
```bash
# Verificar en: https://dashboard.stripe.com/test/apikeys
# Asegurarse de usar claves de TEST (sk_test_, pk_test_)
```

### Webhook no funciona localmente
```bash
# Usar Stripe CLI para forward local:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Pago se procesa pero no se guarda en DB
```bash
# 1. Verificar webhooks en: https://dashboard.stripe.com/test/webhooks
# 2. Revisar logs de la app
# 3. Verificar que el webhook endpoint responde 200
```

---

## 📝 Próximos Pasos Sugeridos

1. **Crear productos reales** en Stripe Dashboard
2. **Configurar webhooks** para producción
3. **Implementar manejo de reembolsos**
4. **Agregar testing de subscripciones**
5. **Configurar alertas de pagos fallidos**
6. **Implementar retry logic** para webhooks
7. **Agregar logs detallados** de transacciones

---

## 📞 Recursos de Soporte

- **Documentación Stripe**: https://docs.stripe.com/
- **API Reference**: https://docs.stripe.com/api
- **Stripe Testing Guide**: https://docs.stripe.com/testing
- **Webhook Events**: https://docs.stripe.com/webhooks
- **Discord Stripe**: https://discord.gg/stripe

---

**Última actualización**: 14 de Noviembre, 2025
**Estado**: ✅ Listo para testing
