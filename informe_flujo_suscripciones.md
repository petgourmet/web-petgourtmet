# Informe Completo: Flujo de Suscripciones PetGourmet

## Resumen Ejecutivo

Este informe analiza el flujo completo de suscripciones en PetGourmet, desde el checkout inicial hasta la activación de la suscripción, identificando problemas potenciales y proporcionando recomendaciones para mejorar la estabilidad en producción.

## 1. Análisis del Flujo Inicial

### ¿Qué sucede cuando el usuario hace clic en "Continuar al pago"?

Cuando el usuario hace clic en "Continuar al pago" en el checkout modal (`components/checkout-modal.tsx`), se ejecuta el siguiente flujo:

1. **Verificación de suscripciones**: Se verifica si hay productos de suscripción en el carrito
2. **Generación de referencia única**: Se crea un `external_reference` con prefijo `subscription_` para identificar suscripciones
3. **Validación de usuario**: Se verifica que el usuario esté autenticado
4. **Validación de carrito**: Se asegura que solo haya una suscripción por transacción
5. **Creación de registro inicial**: Se inserta un registro en `unified_subscriptions`
6. **Redirección a MercadoPago**: Se redirige al usuario al enlace de suscripción

### Código clave del flujo inicial:
```javascript
// Crear registro de suscripción en la base de datos
const subscriptionData = {
  user_id: user.id,
  subscription_type: subscriptionType,
  status: 'pending',
  external_reference: externalReference,
  customer_data: {
    firstName: customerInfo.firstName,
    lastName: customerInfo.lastName,
    email: user.email,
    phone: customerInfo.phone,
    address: shippingAddress
  },
  cart_items: cart.map(item => ({...}))
}
```

## 2. Tabla de Registro Inicial: `unified_subscriptions`

### Estructura de la tabla

La tabla `unified_subscriptions` es una tabla unificada que combina `pending_subscriptions` y `user_subscriptions`. Se crea el registro inicial con los siguientes datos:

#### Campos capturados inicialmente:
- **user_id**: UUID del usuario autenticado
- **subscription_type**: Tipo de suscripción (weekly, biweekly, monthly, etc.)
- **status**: 'pending' (estado inicial)
- **external_reference**: Referencia única con prefijo 'subscription_'
- **customer_data**: Información del cliente (nombre, email, teléfono, dirección)
- **cart_items**: Items del carrito con detalles del producto
- **created_at**: Timestamp de creación
- **updated_at**: Timestamp de última actualización

#### Estados válidos según constraints:
```sql
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'active', 'paused', 'expired', 'suspended'))
```

#### Tipos de suscripción válidos:
```sql
CHECK (subscription_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'))
```

## 3. Validación de Webhooks de MercadoPago

### Configuración actual

**Archivo**: `setup_webhooks.js`
- **URL del webhook**: `https://petgourmet.mx/api/mercadopago/webhook`
- **Token**: `APP_USR-1329434229865091-103120-bd57a35fcc4262dcc18064dd52ccaac7-1227980651`
- **Eventos configurados**:
  - `payment`
  - `subscription_preapproval`
  - `subscription_authorized_payment`

### Procesamiento de webhooks

**Endpoint**: `app/api/mercadopago/webhook/route.ts`

El webhook procesa los siguientes tipos:
1. **payment**: Pagos individuales
2. **subscription_preapproval**: Autorización de suscripción
3. **subscription_authorized_payment**: Pagos autorizados de suscripción
4. **plan**: Planes (no procesado)
5. **invoice**: Facturas (no procesado)

### Validación de firma
- **Producción**: Validación obligatoria usando HMAC SHA256
- **Desarrollo**: Validación omitida
- **Formato**: `ts=timestamp,v1=hash`

## 4. Flujo Completo de Suscripción

### Diagrama de flujo:

```
1. Usuario hace clic "Continuar al pago"
   ↓
2. Se crea registro en unified_subscriptions (status: 'pending')
   ↓
3. Redirección a MercadoPago
   ↓
4. Usuario completa el pago en MercadoPago
   ↓
5. MercadoPago envía webhook de subscription_preapproval
   ↓
6. Webhook actualiza status a 'active'
   ↓
7. Se configuran fechas de facturación
   ↓
8. Suscripción activa y funcional
```

### Transiciones de estado:

- **pending** → **active**: Cuando se recibe webhook de autorización
- **active** → **paused**: Cuando se pausa la suscripción
- **active** → **cancelled**: Cuando se cancela la suscripción
- **paused** → **active**: Cuando se reanuda la suscripción
- **active** → **expired**: Cuando expira la suscripción
- **active** → **suspended**: Cuando se suspende por falta de pago

## 5. Problemas Identificados en Producción

### 5.1 Problemas de validación de firma
**Síntoma**: Webhooks rechazados por firma inválida
**Causa**: Configuración incorrecta del webhook secret o formato de firma
**Impacto**: Suscripciones quedan en estado 'pending' indefinidamente

### 5.2 Duplicación de suscripciones
**Síntoma**: Múltiples registros para la misma suscripción
**Causa**: Reenvío de webhooks o errores en el procesamiento
**Evidencia**: Archivos de migración para limpiar duplicados

### 5.3 Estados inconsistentes
**Síntoma**: Suscripciones con estados no válidos como 'approved'
**Causa**: Mapeo incorrecto de estados de MercadoPago
**Evidencia**: Migraciones para corregir estados inválidos

### 5.4 Problemas de sincronización
**Síntoma**: Diferencias entre estado en BD y MercadoPago
**Causa**: Fallos en el procesamiento de webhooks
**Impacto**: Usuarios con suscripciones activas en MP pero inactivas en BD

### 5.5 Manejo de errores insuficiente
**Síntoma**: Errores no capturados correctamente
**Causa**: Falta de logging detallado y manejo de excepciones
**Impacto**: Dificulta el debugging en producción

## 6. Recomendaciones

### 6.1 Inmediatas (Alta prioridad)

1. **Verificar configuración de webhook secret**
   ```bash
   # Verificar que MERCADOPAGO_WEBHOOK_SECRET esté configurado
   echo $MERCADOPAGO_WEBHOOK_SECRET
   ```

2. **Implementar logging mejorado**
   - Agregar logs detallados en cada paso del webhook
   - Implementar alertas para webhooks fallidos
   - Crear dashboard de monitoreo

3. **Validar configuración de webhooks**
   ```bash
   node setup_webhooks.js
   ```

### 6.2 Mediano plazo (Media prioridad)

1. **Implementar idempotencia**
   - Agregar campo `webhook_id` para evitar procesamiento duplicado
   - Implementar locks para prevenir condiciones de carrera

2. **Mejorar manejo de estados**
   ```sql
   -- Agregar constraint para transiciones válidas
   ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_state_transitions 
   CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired', 'suspended'));
   ```

3. **Implementar retry automático**
   - Queue de webhooks fallidos
   - Reintentos exponenciales
   - Dead letter queue para webhooks irrecuperables

### 6.3 Largo plazo (Baja prioridad)

1. **Implementar sincronización periódica**
   - Job que sincronice estados con MercadoPago cada hora
   - Detección automática de inconsistencias

2. **Mejorar testing**
   - Tests de integración con MercadoPago sandbox
   - Tests de webhooks con datos reales
   - Simulación de fallos de red

3. **Implementar métricas**
   - Tasa de éxito de webhooks
   - Tiempo de procesamiento
   - Alertas automáticas

## 7. Checklist de Validación

### Antes de cada despliegue:
- [ ] Verificar que MERCADOPAGO_WEBHOOK_SECRET esté configurado
- [ ] Probar webhook con herramienta como ngrok en desarrollo
- [ ] Verificar que la URL del webhook sea accesible públicamente
- [ ] Validar que los logs se estén generando correctamente
- [ ] Probar flujo completo en ambiente de staging

### Monitoreo continuo:
- [ ] Revisar logs de webhooks diariamente
- [ ] Verificar suscripciones en estado 'pending' por más de 1 hora
- [ ] Comparar estados entre BD y MercadoPago semanalmente
- [ ] Revisar métricas de tasa de éxito de webhooks

## 8. Conclusiones

El flujo de suscripciones de PetGourmet está bien estructurado pero presenta vulnerabilidades en producción principalmente relacionadas con:

1. **Validación de webhooks**: Configuración de firma y manejo de errores
2. **Sincronización de estados**: Inconsistencias entre BD y MercadoPago
3. **Manejo de duplicados**: Falta de idempotencia en el procesamiento
4. **Logging insuficiente**: Dificulta el debugging de problemas

La implementación de las recomendaciones propuestas debería resolver la mayoría de los problemas reportados en producción y mejorar significativamente la confiabilidad del sistema de suscripciones.

---

**Fecha del informe**: $(date)
**Versión**: 1.0
**Autor**: SOLO Coding Agent
**Estado**: Completo