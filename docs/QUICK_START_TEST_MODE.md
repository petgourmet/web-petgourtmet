# 🚀 GUÍA RÁPIDA: Configurar Modo de Pruebas

**Tiempo estimado**: 5 minutos

---

## 📋 PASO A PASO

### 1. Obtener Credenciales de Prueba

1. Ve a: https://www.mercadopago.com.mx/developers/panel/app
2. Selecciona tu aplicación
3. Ve a **"Credenciales"**
4. Copia las credenciales de **PRUEBAS** (empiezan con `TEST-`)

---

### 2. Crear Archivo de Variables de Entorno

En la raíz del proyecto, crea el archivo `.env.local`:

```bash
# En Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# En Mac/Linux
touch .env.local
```

---

### 3. Configurar Variables Mínimas

Copia esto en tu `.env.local` y reemplaza con tus credenciales:

```env
# ACTIVAR MODO DE PRUEBAS
NEXT_PUBLIC_PAYMENT_TEST_MODE=true

# CREDENCIALES DE MERCADOPAGO (PRUEBA)
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-tu-access-token-aqui
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=TEST-tu-public-key-aqui
MERCADOPAGO_WEBHOOK_SECRET_TEST=test_webhook_secret

# SUPABASE (tus credenciales actuales)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# URL DE LA APP
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 4. Reiniciar Servidor

```bash
# Detener servidor: Ctrl+C

# Iniciar de nuevo
npm run dev
```

---

### 5. Probar Suscripción

1. Ir a: http://localhost:3000
2. Añadir producto de suscripción al carrito
3. Hacer checkout
4. Debería redirigir a: `sandbox.mercadopago.com.mx`

---

### 6. Completar Pago de Prueba

Usa esta tarjeta de prueba:

```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre: APRO
```

---

## ✅ VERIFICAR QUE FUNCIONA

### Deberías ver en la consola:

```
✅ Modo de pruebas activo
✅ Preapproval creado exitosamente
✅ external_reference: SUB-xxx-xxx-xxx
```

### NO deberías ver:

```
❌ Cannot operate between different countries
❌ Access token no configurado
```

---

## 🆘 PROBLEMAS COMUNES

### Error: "Access Token no configurado"

**Solución**: Verifica que `.env.local` tiene:
```
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-...
```

### Error: "Cannot operate between different countries"

**Solución**: Verifica que:
1. `NEXT_PUBLIC_PAYMENT_TEST_MODE=true`
2. Reiniciaste el servidor
3. El token empieza con `TEST-`

### No redirige a MercadoPago

**Solución**: 
1. Abre la consola del navegador (F12)
2. Verifica errores en la pestaña "Console"
3. Verifica que la llamada a la API fue exitosa en "Network"

---

## 📚 MÁS INFORMACIÓN

Ver documentación completa: `/docs/MERCADOPAGO_TEST_MODE_SETUP.md`

---

**¿Sigue sin funcionar?** Revisa los logs del servidor en la terminal.
