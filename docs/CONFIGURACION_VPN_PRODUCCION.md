# ✅ Configuración con VPN - PetGourmet

## 🌐 Desarrollo con VPN a México

**Fecha:** 7 de octubre de 2025  
**Modo:** PRODUCCIÓN con VPN  
**Estado:** ✅ Servidor activo en http://localhost:3000

---

## 🔧 Configuración Actual

### Variables de Entorno (.env)

```env
# Modo de operación
NODE_ENV=development
NEXT_PUBLIC_PAYMENT_TEST_MODE=false           # ⚠️ PRODUCCIÓN
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
USE_MERCADOPAGO_MOCK=false

# Credenciales activas (PRODUCCIÓN)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-78b50431-...
```

### Estado del Servidor

```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
- Network:      http://10.152.33.28:3000
- Environments: .env

✓ Ready in 1984ms
```

---

## ⚠️ IMPORTANTE: Estás en Modo PRODUCCIÓN

### 🚨 Consideraciones Críticas

1. **Pagos Reales**
   - ❌ Todas las transacciones cobran dinero REAL
   - ❌ Las suscripciones son REALES
   - ❌ Los webhooks afectan la base de datos de producción

2. **Datos Reales**
   - ⚠️ Los clientes recibirán emails reales
   - ⚠️ Las órdenes se registran en producción
   - ⚠️ Los cobros se procesarán inmediatamente

3. **Testing Limitado**
   - ❌ No puedes usar tarjetas de prueba
   - ❌ Debes usar tarjetas reales (cuidado!)
   - ❌ Los rechazos afectan métricas reales

---

## 🧪 Para Testing Seguro

### Opción A: Tarjeta Real de Bajo Monto

Si necesitas probar con credenciales de producción:

1. Usa una tarjeta real tuya
2. Crea productos de **$1 MXN** para pruebas
3. Cancela inmediatamente después de probar
4. Reversa el pago si es necesario

### Opción B: Obtener Credenciales TEST (Recomendado)

Para testing sin riesgos:

1. Ve a: https://www.mercadopago.com.mx/developers/panel/app
2. Busca "Credenciales de prueba"
3. Copia las que empiecen con `TEST-`
4. Actualiza `.env` con esas credenciales
5. Cambia `NEXT_PUBLIC_PAYMENT_TEST_MODE=true`

---

## 📋 Checklist Antes de Probar

Antes de hacer cualquier prueba en modo producción:

- [ ] ✅ VPN conectada a México
- [ ] ✅ Navegador con IP de México verificada
- [ ] ⚠️ Consciente de que usarás dinero real
- [ ] ⚠️ Tienes forma de reversar/cancelar el pago
- [ ] ⚠️ Tienes respaldo de la base de datos
- [ ] ⚠️ Los emails están configurados (notificarán a clientes reales)

---

## 🔄 Flujo de Testing con Producción

### 1. Preparación

```bash
# Verificar VPN
curl https://ipapi.co/json/

# Debería mostrar:
# "country": "MX"
# "country_name": "Mexico"
```

### 2. Crear Producto de Prueba

```sql
-- En Supabase, crea un producto de $1 para pruebas
INSERT INTO products (name, price, stock, category_id)
VALUES ('PRUEBA - NO COMPRAR', 1.00, 1, 1);
```

### 3. Probar Checkout

1. Navega a: `http://localhost:3000/productos`
2. Agrega el producto de prueba al carrito
3. Selecciona suscripción (¡será REAL!)
4. **PAUSA AQUÍ** - Verifica que todo esté correcto
5. Completa el pago con tarjeta real
6. Verifica que el webhook active la suscripción
7. **INMEDIATAMENTE** cancela la suscripción

### 4. Cancelar Suscripción de Prueba

```bash
# Ve al panel de MercadoPago
# https://www.mercadopago.com.mx/subscriptions/list

# O cancela desde la base de datos
UPDATE unified_subscriptions 
SET status = 'cancelled'
WHERE user_id = 'TU_USER_ID'
AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 🐛 Troubleshooting

### Error: "Cannot operate between different countries"

**Causa:** VPN no está funcionando o IP no es de México

**Solución:**
```bash
# 1. Verifica tu IP
curl https://ipapi.co/json/

# 2. Reinicia VPN
# 3. Verifica de nuevo
# 4. Limpia cache del navegador
# 5. Reinicia servidor
```

### Error: "Invalid credentials"

**Causa:** Credenciales incorrectas o expiradas

**Solución:**
1. Ve al panel de MercadoPago
2. Regenera las credenciales de producción
3. Actualiza `.env`
4. Reinicia servidor

### Webhook no se ejecuta

**Causa:** URL de webhook no accesible desde internet

**Solución:**
```env
# Para testing local con webhooks, usa ngrok
npx ngrok http 3000

# Actualiza en MercadoPago:
# https://tu-ngrok-url.ngrok.io/api/mercadopago/webhook
```

---

## 📊 Monitoreo en Tiempo Real

### Panel de MercadoPago

Monitorea las transacciones en:
- Pagos: https://www.mercadopago.com.mx/movements
- Suscripciones: https://www.mercadopago.com.mx/subscriptions/list

### Logs del Servidor

```bash
# Terminal donde corre npm run dev
# Verás logs como:
🔷 API: create-subscription-preference - Inicio
📋 Datos recibidos: {...}
✅ Token de MercadoPago disponible
📤 Creando Preapproval en MercadoPago
📥 Respuesta de MercadoPago: 200 OK
✅ Preapproval creado exitosamente
```

### Base de Datos

```sql
-- Monitorea suscripciones en tiempo real
SELECT 
  id,
  external_reference,
  status,
  transaction_amount,
  created_at
FROM unified_subscriptions
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 Recomendaciones Finales

### ✅ DO (Hacer)

- ✅ Usa VPN estable a México
- ✅ Verifica tu IP antes de cada prueba
- ✅ Crea productos de bajo monto para testing
- ✅ Cancela suscripciones de prueba inmediatamente
- ✅ Mantén respaldos de la base de datos
- ✅ Monitorea el panel de MercadoPago constantemente

### ❌ DON'T (No Hacer)

- ❌ No pruebes con tarjetas de otros
- ❌ No dejes suscripciones activas sin supervisión
- ❌ No uses emails de clientes reales para pruebas
- ❌ No despliegues a producción sin testing exhaustivo
- ❌ No compartas tus credenciales de producción
- ❌ No olvides estar conectado a VPN

---

## 🎯 Transición a Credenciales TEST

Cuando obtengas credenciales TEST, actualiza:

```env
# Cambiar esto:
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-...

# Por esto:
NEXT_PUBLIC_PAYMENT_TEST_MODE=true
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-...
```

Y podrás:
- ✅ Desarrollar sin VPN
- ✅ Usar tarjetas de prueba
- ✅ Testing ilimitado sin cobros reales
- ✅ Simular aprobaciones/rechazos

---

## 📞 Recursos

- **Panel MercadoPago:** https://www.mercadopago.com.mx/developers/panel/app
- **Documentación API:** https://www.mercadopago.com.mx/developers/es/docs
- **Soporte:** developers@mercadopago.com.mx
- **Tarjetas de Prueba:** https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/test-cards

---

**Estado:** ✅ Configurado para producción con VPN  
**Última actualización:** 7 de octubre de 2025  
**Próximo paso:** Probar checkout con producto de bajo monto
