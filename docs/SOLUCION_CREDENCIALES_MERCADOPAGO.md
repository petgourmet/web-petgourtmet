# 🔐 Solución: Credenciales de MercadoPago para Desarrollo desde Colombia

## 🚨 Problema Actual

**Error:** "Cannot operate between different countries"

**Causa:** Estás usando credenciales de **PRODUCCIÓN** de México (`APP_USR-...`) desde Colombia.

MercadoPago bloquea operaciones de producción entre diferentes países por seguridad.

---

## ✅ Solución: Credenciales de SANDBOX/PRUEBA

### Paso 1: Acceder al Panel de Desarrolladores

1. Ve a: **https://www.mercadopago.com.mx/developers/panel/app**
2. Inicia sesión con tu cuenta de MercadoPago México
3. Selecciona tu aplicación: **"PetGourmet"** (o la que tengas configurada)

---

### Paso 2: Encontrar Credenciales de Prueba

En el panel, deberías ver algo como:

```
┌─────────────────────────────────────┐
│  Credenciales                       │
├─────────────────────────────────────┤
│  ✅ Credenciales de producción      │
│     APP_USR-1329434229865091-...    │
│                                     │
│  🧪 Credenciales de prueba          │
│     TEST-1234567890123456-...       │
│                                     │
└─────────────────────────────────────┘
```

---

### Paso 3: Identificar el Tipo de Credenciales

#### ✅ Credenciales de PRUEBA/SANDBOX (Correctas para desarrollo)
```
Access Token:  TEST-1234567890123456-012345-abc123def456...
Public Key:    TEST-12345678-abcd-1234-efgh-123456789012
```
- **Prefijo:** `TEST-`
- **Uso:** Desarrollo, testing, sandbox
- **Restricción:** ❌ NO tiene restricción de país
- **Pagos:** ✅ Simulados (no cobran dinero real)

#### ❌ Credenciales de PRODUCCIÓN (Actual - causa error)
```
Access Token:  APP_USR-1329434229865091-103120-bd57a35fcc...
Public Key:    APP_USR-78b50431-bdd5-435d-b76f-98114b4fcccd
```
- **Prefijo:** `APP_USR-`
- **Uso:** Producción, pagos reales
- **Restricción:** ✅ SOLO desde México
- **Pagos:** 💰 Reales (cobran dinero real)

---

### Paso 4: Copiar Credenciales de Prueba

Una vez que encuentres las **Credenciales de prueba**, copia:

1. **Access Token** (TEST-...)
2. **Public Key** (TEST-...)
3. **Client ID** (número)
4. **Client Secret** (si está disponible)

---

### Paso 5: Actualizar `.env`

Reemplaza en tu archivo `.env`:

```env
# === MERCADOPAGO PRUEBAS/SANDBOX ===
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-[TU-TOKEN-AQUI]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=TEST-[TU-PUBLIC-KEY-AQUI]
MERCADOPAGO_WEBHOOK_SECRET_TEST=test_webhook_secret_123
CLIENT_ID_TEST=[TU-CLIENT-ID-AQUI]
CLIENT_SECRET_TEST=[TU-CLIENT-SECRET-AQUI]

# === VARIABLES DINÁMICAS ===
MERCADOPAGO_ACCESS_TOKEN=TEST-[TU-TOKEN-AQUI]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-[TU-PUBLIC-KEY-AQUI]
MERCADOPAGO_WEBHOOK_SECRET=test_webhook_secret_123
CLIENT_ID=[TU-CLIENT-ID-AQUI]
CLIENT_SECRET=[TU-CLIENT-SECRET-AQUI]
```

---

### Paso 6: Reiniciar Servidor

```powershell
# Detener servidor
Stop-Process -Name node -Force

# Iniciar servidor
npm run dev
```

---

## 🎯 Alternativas si NO tienes Credenciales de Prueba

### Opción A: Solicitar Credenciales de Prueba

Si no ves la sección "Credenciales de prueba" en tu panel:

1. Contacta a soporte de MercadoPago México
2. Email: **developers@mercadopago.com.mx**
3. Solicita: "Activar credenciales de prueba/sandbox para mi aplicación"

### Opción B: Crear Nueva Aplicación de Prueba

1. Ve a: https://www.mercadopago.com.mx/developers/panel/app
2. Clic en **"Crear aplicación"**
3. Nombre: **"PetGourmet Test"**
4. Tipo: **"Pagos online y presenciales"**
5. Una vez creada, obtendrás automáticamente credenciales TEST-

### Opción C: Usar Cuenta de Usuario de Prueba

MercadoPago permite crear usuarios de prueba:

1. Ve a: https://www.mercadopago.com.mx/developers/panel/test-users
2. Clic en **"Crear usuario de prueba"**
3. Tipo: **"Vendedor"**
4. Obtén las credenciales del usuario de prueba
5. Usa esas credenciales en tu `.env`

---

## 📋 Checklist de Verificación

Antes de continuar, verifica:

- [ ] Tengo acceso al panel de desarrolladores de MercadoPago
- [ ] Puedo ver mi aplicación "PetGourmet"
- [ ] Hay una sección de "Credenciales" en mi aplicación
- [ ] Veo "Credenciales de producción" (APP_USR-)
- [ ] Veo "Credenciales de prueba" (TEST-) ← **ESTO ES LO QUE NECESITAS**

---

## 🚫 ¿Por qué NO usar Credenciales de Producción?

1. **Restricción Geográfica**
   - Solo funcionan desde México
   - Bloqueadas en Colombia por seguridad

2. **Pagos Reales**
   - Cobran dinero real
   - No puedes revertir fácilmente

3. **Riesgo Legal**
   - Crear suscripciones de prueba con tarjetas reales es ilegal
   - Viola términos de servicio de MercadoPago

4. **Testing Imposible**
   - No puedes probar errores
   - No puedes simular rechazos
   - No puedes cancelar sin afectar clientes reales

---

## 🎯 Estado Actual

**Configuración actual en `.env`:**
```env
✅ NEXT_PUBLIC_PAYMENT_TEST_MODE=true       (Correcto)
✅ NODE_ENV=development                     (Correcto)
❌ MERCADOPAGO_ACCESS_TOKEN=APP_USR-...     (PRODUCCIÓN - causa error)
```

**Necesitas:**
```env
✅ NEXT_PUBLIC_PAYMENT_TEST_MODE=true
✅ NODE_ENV=development
✅ MERCADOPAGO_ACCESS_TOKEN=TEST-...        (PRUEBA - sin restricción geográfica)
```

---

## 📞 Contacto y Soporte

### MercadoPago México - Soporte Desarrolladores
- **Email:** developers@mercadopago.com.mx
- **Portal:** https://www.mercadopago.com.mx/developers/es/support
- **Documentación:** https://www.mercadopago.com.mx/developers/es/docs

### Preguntas Frecuentes

**P: ¿Las credenciales TEST cobran dinero real?**  
R: No, son solo para pruebas. Puedes usar tarjetas de prueba.

**P: ¿Puedo desarrollar desde Colombia con credenciales TEST?**  
R: Sí, las credenciales TEST no tienen restricción de país.

**P: ¿Cómo obtengo tarjetas de prueba?**  
R: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/test-cards

**P: ¿Las suscripciones de prueba se activan automáticamente?**  
R: Sí, con tarjetas de prueba aprobadas automáticamente.

---

## 🔄 Próximos Pasos

1. **AHORA:** Ve al panel de MercadoPago y busca "Credenciales de prueba"
2. **Luego:** Copia las credenciales que empiecen con `TEST-`
3. **Después:** Actualiza tu `.env` con esas credenciales
4. **Finalmente:** Reinicia el servidor y prueba el checkout

---

**Última actualización:** 6 de octubre de 2025  
**Estado:** Esperando credenciales TEST- del usuario
