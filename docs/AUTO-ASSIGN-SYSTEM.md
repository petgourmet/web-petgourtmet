# Sistema de Auto-Asignación de Órdenes

## Descripción

Este sistema permite que las órdenes creadas por usuarios (registrados o invitados) se asocien automáticamente con sus cuentas de usuario basándose en el email proporcionado durante el proceso de compra.

## ¿Cómo Funciona?

### Flujo Automático

1. **Usuario realiza una compra**: El usuario completa el proceso de checkout en la tienda
2. **Creación de orden**: Se crea una nueva orden en `/api/mercadopago/create-preference`
3. **Auto-asignación automática**: El sistema llama automáticamente al endpoint `/api/orders/auto-assign`
4. **Búsqueda de usuario**: Se extrae el email del `shipping_address` y se busca en la base de datos
5. **Asignación**: Si se encuentra un usuario con ese email, se asigna el `user_id` a la orden
6. **Resultado**: El usuario puede ver su compra inmediatamente en su perfil

### Integración en el Código

El sistema se integra automáticamente en el endpoint de creación de preferencias de MercadoPago:

```javascript
// En /api/mercadopago/create-preference/route.ts
// Después de crear la orden exitosamente...

try {
  const autoAssignResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/auto-assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id })
  })
  
  if (autoAssignResponse.ok) {
    console.log('✅ Auto-assign completed successfully')
  }
} catch (error) {
  console.log('⚠️ Auto-assign failed (non-critical):', error.message)
}
```

## Endpoints

### GET `/api/orders/auto-assign`

**Descripción**: Obtiene estadísticas de órdenes sin asignar

**Respuesta**:
```json
{
  "success": true,
  "message": "Estadísticas obtenidas",
  "data": {
    "ordersWithoutUserId": 2,
    "sampleOrders": [
      {
        "id": 116,
        "customer_name": "Cliente Test",
        "shipping_address": "{\"customer_data\":{\"email\":\"cliente@petgourmet.mx\"}}"
      }
    ]
  }
}
```

### POST `/api/orders/auto-assign`

**Descripción**: Ejecuta la auto-asignación de órdenes

**Parámetros**:
- `orderId` (opcional): ID específico de orden a procesar
- `processAll` (opcional): Procesar todas las órdenes sin `user_id`

**Ejemplos**:

```javascript
// Procesar una orden específica
fetch('/api/orders/auto-assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: 123 })
})

// Procesar todas las órdenes
fetch('/api/orders/auto-assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ processAll: true })
})
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Procesamiento completado: 1/2 órdenes asociadas exitosamente",
  "data": {
    "processed": 2,
    "successful": 1,
    "failed": 1,
    "details": [
      {
        "orderId": 116,
        "success": true,
        "message": "Orden asociada exitosamente al usuario ID 123"
      },
      {
        "orderId": 117,
        "success": false,
        "message": "Usuario no encontrado para email cliente@test.com"
      }
    ]
  }
}
```

## Scripts de Utilidad

### Script de Demostración

```bash
# Ejecutar demostración completa
node scripts/demo-auto-assign.js

# Solo verificar estado del sistema
node scripts/demo-auto-assign.js --status
```

### Script de Prueba

```bash
# Probar flujo completo de creación y auto-asignación
node scripts/test-auto-assign-flow.js
```

## Casos de Uso

### 1. Usuario Registrado Realiza Compra

- **Escenario**: Un usuario registrado con email `juan@email.com` realiza una compra
- **Resultado**: La orden se asigna automáticamente a su cuenta
- **Beneficio**: El usuario ve su compra inmediatamente en su perfil

### 2. Usuario Invitado Realiza Compra

- **Escenario**: Un usuario no registrado con email `maria@email.com` realiza una compra
- **Resultado**: La orden queda sin asignar inicialmente
- **Beneficio**: Si el usuario se registra después con el mismo email, puede ejecutarse la auto-asignación manualmente

### 3. Procesamiento Masivo

- **Escenario**: Hay múltiples órdenes sin asignar en el sistema
- **Resultado**: Se pueden procesar todas de una vez
- **Beneficio**: Mantenimiento eficiente del sistema

## Configuración

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Estructura de Base de Datos

La tabla `orders` debe tener:
- `id`: ID único de la orden
- `user_id`: ID del usuario (puede ser null)
- `customer_name`: Nombre del cliente
- `shipping_address`: JSON con datos de envío incluyendo email

La tabla `users` debe tener:
- `id`: ID único del usuario
- `email`: Email del usuario (único)

## Monitoreo y Mantenimiento

### Verificar Estado del Sistema

```bash
# Verificar órdenes sin asignar
curl http://localhost:3000/api/orders/auto-assign

# Procesar todas las órdenes pendientes
curl -X POST http://localhost:3000/api/orders/auto-assign \
  -H "Content-Type: application/json" \
  -d '{"processAll": true}'
```

### Logs y Debugging

El sistema registra automáticamente:
- Intentos de auto-asignación
- Éxitos y fallos
- Detalles de procesamiento

Los logs aparecen en la consola del servidor de desarrollo.

## Beneficios del Sistema

✅ **Automático**: No requiere intervención manual
✅ **Transparente**: No afecta la experiencia de compra
✅ **Flexible**: Funciona con usuarios registrados e invitados
✅ **Eficiente**: Procesamiento rápido y escalable
✅ **Robusto**: Manejo de errores no críticos
✅ **Mantenible**: Scripts de utilidad incluidos

## Limitaciones

- Solo funciona si el email en la orden coincide exactamente con el email del usuario
- Requiere que el `shipping_address` contenga el email en el formato correcto
- No asigna órdenes si el usuario no existe en la base de datos

## Troubleshooting

### Problema: Órdenes no se asignan automáticamente

**Posibles causas**:
1. Email no coincide exactamente
2. Usuario no existe en la base de datos
3. Formato incorrecto en `shipping_address`
4. Error de conectividad

**Solución**:
1. Verificar logs del servidor
2. Ejecutar script de demostración
3. Verificar formato de datos

### Problema: Error 500 en endpoint

**Posibles causas**:
1. Variables de entorno no configuradas
2. Error de conexión a base de datos
3. Problema con importaciones

**Solución**:
1. Verificar `.env.local`
2. Revisar logs del servidor
3. Ejecutar `node scripts/demo-auto-assign.js --status`

## Desarrollo Futuro

Posibles mejoras:
- Matching fuzzy de emails (tolerancia a mayúsculas/minúsculas)
- Notificaciones automáticas cuando se asigna una orden
- Dashboard de administración para monitoreo
- Integración con webhooks de MercadoPago
- Historial de auto-asignaciones