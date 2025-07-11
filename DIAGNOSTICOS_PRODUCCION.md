# Herramientas de Diagnóstico de Producción para PetGourmet

Este documento describe las herramientas de diagnóstico creadas para identificar y resolver problemas en el entorno de producción de PetGourmet, específicamente relacionados con la creación de órdenes y la integración con MercadoPago.

## Problema Original

Error 500 al crear órdenes en producción en el endpoint `/api/mercadopago/create-preference`, causado por:
- Diferencias entre la estructura de la tabla `orders` y los datos esperados
- Campos inexistentes o tipos incorrectos en la base de datos
- Posibles problemas de configuración en el entorno de producción

## Herramientas de Diagnóstico Disponibles

### 1. Test de Inserción Básica de Órdenes
**Endpoint:** `POST /api/debug/simple-order-test`

**Propósito:** Verifica la capacidad básica de insertar órdenes en la base de datos.

**Qué hace:**
- Verifica la conexión a Supabase
- Comprueba la estructura de la tabla `orders`
- Inserta una orden de prueba con datos realistas
- Verifica la inserción y parsea el `shipping_address`
- Limpia automáticamente la orden de prueba

**Uso en producción:**
```bash
curl -X POST https://tu-dominio.vercel.app/api/debug/simple-order-test
```

### 2. Simulación del Flujo de MercadoPago
**Endpoint:** `POST /api/debug/mercadopago-flow`

**Propósito:** Simula todo el flujo de creación de órdenes y preferencias de MercadoPago sin hacer llamadas reales a la API.

**Qué hace:**
- Simula datos del formulario del frontend
- Crea una orden en la base de datos
- Verifica las variables de entorno de MercadoPago
- Simula la creación de preferencia (sin llamada real)
- Actualiza la orden con un preference_id simulado
- Verifica el estado final de la orden

**Uso en producción:**
```bash
curl -X POST https://tu-dominio.vercel.app/api/debug/mercadopago-flow
```

### 3. Test del Endpoint Real de MercadoPago
**Endpoint:** `POST /api/debug/test-live-endpoint`

**Propósito:** Prueba el endpoint real de MercadoPago con datos controlados.

**Qué hace:**
- Prepara datos de prueba controlados
- Hace una llamada real al endpoint `/api/mercadopago/create-preference`
- Captura la respuesta completa (headers, status, body)
- Proporciona información detallada del resultado

**Uso en producción:**
```bash
curl -X POST https://tu-dominio.vercel.app/api/debug/test-live-endpoint
```

### 4. Diagnóstico Completo
**Endpoint:** `POST /api/debug/full-diagnostic`

**Propósito:** Ejecuta todos los tests de diagnóstico en secuencia para obtener un reporte completo.

**Qué hace:**
- Ejecuta todos los tests anteriores
- Verifica variables de entorno
- Proporciona un resumen completo del estado del sistema
- Indica qué tests pasaron y cuáles fallaron

**Uso en producción:**
```bash
curl -X POST https://tu-dominio.vercel.app/api/debug/full-diagnostic
```

## Estructura de la Tabla Orders Confirmada

Basado en las pruebas, la tabla `orders` tiene la siguiente estructura:

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id UUID,
  status VARCHAR,
  total DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  shipping_address TEXT,  -- JSON string con toda la información del formulario
  payment_intent_id VARCHAR,
  payment_status VARCHAR,
  customer_name VARCHAR,
  customer_phone VARCHAR
);
```

## Formato del Shipping Address

El campo `shipping_address` almacena un JSON con la siguiente estructura:

```json
{
  "order_number": "PG1234567890",
  "customer_data": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "5551234567",
    "address": {
      "street_name": "Av. Insurgentes",
      "street_number": "123",
      "zip_code": "01000",
      "city": "Ciudad de México",
      "state": "CDMX"
    }
  },
  "items": [{
    "id": "product-1",
    "title": "Producto Test",
    "quantity": 1,
    "unit_price": 599.00
  }],
  "subtotal": 599.00,
  "frequency": "none",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

## Cómo Usar las Herramientas

### Paso 1: Ejecutar Diagnóstico Completo
```bash
curl -X POST https://petgourmet.vercel.app/api/debug/full-diagnostic
```

Este comando te dará una visión general de todos los problemas.

### Paso 2: Analizar Resultados
- Si todos los tests pasan: el problema puede estar en el frontend o en la configuración específica
- Si falla el test básico: hay problemas con Supabase o la estructura de la tabla
- Si falla solo MercadoPago: revisa las variables de entorno de MercadoPago
- Si falla el endpoint real: hay problemas específicos en el código del endpoint

### Paso 3: Ejecutar Tests Específicos
Dependiendo de los resultados del diagnóstico completo, ejecuta los tests individuales para obtener más detalles:

```bash
# Test específico de base de datos
curl -X POST https://petgourmet.vercel.app/api/debug/simple-order-test

# Test específico de MercadoPago
curl -X POST https://petgourmet.vercel.app/api/debug/mercadopago-flow

# Test del endpoint real
curl -X POST https://petgourmet.vercel.app/api/debug/test-live-endpoint
```

## Variables de Entorno Requeridas

Las herramientas verifican que estas variables estén configuradas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_public_key

# Base URL
NEXT_PUBLIC_BASE_URL=https://tu-dominio.vercel.app
```

## Interpretación de Resultados

### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Test completed successfully",
  "results": {
    "supabase_connection": "✅ Success",
    "table_structure": "✅ Success",
    "order_insertion": "✅ Success"
  }
}
```

### Respuesta con Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "details": { ... },
  "step": "paso_donde_falló"
}
```

## Logs en Producción

Todos los endpoints generan logs detallados que aparecerán en los logs de Vercel:
- Busca por el `debugId` para seguir un test específico
- Los logs incluyen emojis para fácil identificación (✅ éxito, ❌ error)
- Cada paso del proceso está claramente marcado

## Limpieza Automática

Todos los tests que crean datos de prueba los eliminan automáticamente al final para no ensuciar la base de datos de producción.

## Seguridad

- Los endpoints están diseñados solo para diagnóstico
- No exponen información sensible en las respuestas
- Los datos de prueba están claramente marcados como tales
- Se pueden deshabilitar fácilmente removiendo los archivos cuando ya no se necesiten

## Próximos Pasos

1. Ejecutar el diagnóstico completo en producción
2. Analizar los resultados y identificar problemas específicos
3. Corregir los problemas identificados
4. Volver a ejecutar los tests para confirmar las correcciones
5. Probar el flujo real de creación de órdenes
6. Remover las herramientas de diagnóstico una vez resuelto el problema
