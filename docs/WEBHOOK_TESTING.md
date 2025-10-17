# Guía de Pruebas del Sistema de Webhooks

## Checklist de Verificación Post-Despliegue

### 1. Verificación de Configuración

#### Variables de Entorno
```bash
# Verificar que estén configuradas:
✓ MERCADOPAGO_ACCESS_TOKEN
✓ MERCADOPAGO_WEBHOOK_SECRET
✓ NEXT_PUBLIC_BASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
```

#### Endpoints Activos
```bash
# GET - Debe responder con status: active
curl https://petgourmet.mx/api/mercadopago/webhook

# GET - Debe responder con información de webhook
curl https://petgourmet.mx/api/subscriptions/webhook
```

### 2. Prueba de Flujo Completo de Compra

#### Paso 1: Crear Suscripción
1. Ir a `/crear-plan` o `/productos`
2. Seleccionar un producto con suscripción
3. Agregar al carrito
4. Ir a checkout

**Verificar**:
- ✓ Se crea registro en `unified_subscriptions` con status: `pending`
- ✓ `external_reference` tiene formato: `SUB-{userId}-{productId}-{timestamp}`
- ✓ Se redirige a MercadoPago

#### Paso 2: Completar Pago en MercadoPago
1. Usar tarjeta de prueba:
   - **Aprobada**: 5031 7557 3453 0604
   - **CVV**: 123
   - **Fecha**: Cualquier fecha futura
   - **Nombre**: APRO

**Verificar en MercadoPago**:
- ✓ Pago aparece con status: `approved`
- ✓ `external_reference` coincide con el de la suscripción

#### Paso 3: Verificar Webhook
**En logs del servidor** (Vercel/consola):
```
✅ Webhook MercadoPago recibido
✅ Pago procesado desde webhook
✅ Suscripción encontrada
✅ Suscripción activada exitosamente
```

**En base de datos** (`unified_subscriptions`):
```sql
SELECT 
  id,
  status, -- debe ser 'active'
  external_reference,
  mercadopago_payment_id, -- debe tener valor
  last_billing_date, -- debe ser timestamp actual
  next_billing_date -- debe ser +1 mes
FROM unified_subscriptions
WHERE external_reference = 'SUB-XXX-XXX-XXX';
```

#### Paso 4: Verificar Email
- ✓ Cliente recibe email de confirmación
- ✓ Admin recibe notificación de nueva suscripción

### 3. Pruebas de Casos Edge

#### Caso A: Webhook Llega Antes que el Usuario Regrese
**Escenario**: Usuario paga pero cierra la ventana antes de regresar

**Prueba**:
1. Hacer pago en MercadoPago
2. Cerrar ventana inmediatamente
3. Esperar 30 segundos

**Resultado Esperado**:
- ✓ Webhook activa la suscripción automáticamente
- ✓ Status = 'active' en menos de 1 minuto

#### Caso B: Usuario Regresa Antes que Llegue el Webhook
**Escenario**: Red lenta o delay en MercadoPago

**Prueba**:
1. Hacer pago y regresar inmediatamente
2. Verificar endpoint `/api/subscriptions/verify-return`

**Resultado Esperado**:
- ✓ Endpoint verifica pago con MercadoPago API
- ✓ Activa suscripción si pago está aprobado
- ✓ No duplica activación cuando llega webhook

#### Caso C: External Reference Mismatch
**Escenario**: external_reference del pago ≠ external_reference de la suscripción

**Prueba**:
1. Revisar logs del sistema de mapeo
2. Verificar que use estrategias alternativas

**Resultado Esperado**:
- ✓ Sistema intenta 5 estrategias de mapeo
- ✓ Encuentra suscripción por email + timestamp
- ✓ Activa correctamente

#### Caso D: Webhook Duplicado
**Escenario**: MercadoPago envía mismo webhook múltiples veces

**Prueba**:
1. Simular webhook duplicado (POST manual)
2. Verificar que no se cree registro duplicado

**Resultado Esperado**:
- ✓ Segunda ejecución detecta que ya está activa
- ✓ No se duplica billing_history
- ✓ Retorna success sin cambios

### 4. Pruebas de Errores

#### Error 1: Pago Rechazado
**Tarjeta de prueba rechazada**: 5031 7557 3453 0604 (cambiar últimos dígitos a 0601)

**Resultado Esperado**:
- ✓ Webhook recibe status: `rejected`
- ✓ Suscripción mantiene status: `pending`
- ✓ Usuario ve mensaje de error
- ✓ Puede reintentar pago

#### Error 2: Pago Pendiente (Efectivo)
**Método de pago**: Oxxo, 7-Eleven, etc.

**Resultado Esperado**:
- ✓ Webhook recibe status: `pending`
- ✓ Suscripción mantiene status: `pending`
- ✓ Usuario ve instrucciones de pago
- ✓ Se activa cuando pago sea confirmado

#### Error 3: Webhook con Firma Inválida
**Prueba**:
```bash
curl -X POST https://petgourmet.mx/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: INVALID_SIGNATURE" \
  -d '{"type":"payment","data":{"id":"123"}}'
```

**Resultado Esperado**:
- ✓ Webhook loggea warning sobre firma inválida
- ✓ Continúa procesando (en desarrollo)
- ✓ Rechaza en producción (si `webhookSecret` está configurado)

### 5. Pruebas de Performance

#### Tiempo de Respuesta del Webhook
**Objetivo**: < 2 segundos

**Prueba**:
```javascript
// En logs buscar:
"processingTime": "1234ms"
```

**Umbrales**:
- ✅ Excelente: < 1s
- ✅ Bueno: 1-2s
- ⚠️ Aceptable: 2-5s
- ❌ Lento: > 5s

#### Reintentos de MercadoPago
**Objetivo**: 0 reintentos

**Verificar en MercadoPago Dashboard**:
- Webhooks → Logs
- Buscar reintentos (status 500/timeout)

**Si hay reintentos**:
1. Revisar logs del servidor
2. Identificar causa (timeout, error, etc.)
3. Optimizar código problemático

### 6. Monitoreo Continuo

#### Métricas Diarias
```sql
-- Webhooks recibidos hoy
SELECT COUNT(*) 
FROM webhook_logs 
WHERE DATE(created_at) = CURRENT_DATE;

-- Tasa de éxito
SELECT 
  COUNT(CASE WHEN success = true THEN 1 END)::float / COUNT(*)::float * 100 as success_rate
FROM webhook_logs 
WHERE DATE(created_at) = CURRENT_DATE;

-- Suscripciones activadas vs pendientes
SELECT 
  status,
  COUNT(*) as count
FROM unified_subscriptions 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status;
```

#### Alertas Automáticas
Configurar alertas si:
- ✓ Tasa de éxito < 95%
- ✓ Tiempo promedio > 3s
- ✓ Suscripciones pendientes > 10 (después de 1 hora)
- ✓ Errores de webhook > 5 en 10 minutos

### 7. Herramientas de Debug

#### Ver Estado de Webhook en MercadoPago
```bash
# Usando MercadoPago API
curl -X GET \
  'https://api.mercadopago.com/v1/webhooks' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

#### Ver Logs de Webhook en Vercel
```bash
vercel logs --follow
```

#### Forzar Re-procesamiento Manual
Si una suscripción no se activó:

```bash
curl -X POST https://petgourmet.mx/api/admin/activate-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "uuid-here",
    "payment_id": "123456789",
    "external_reference": "SUB-XXX-XXX-XXX"
  }'
```

#### Validar Pago Directamente con MercadoPago
```bash
curl -X POST https://petgourmet.mx/api/mercadopago/validate-payment \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "123456789"
  }'
```

### 8. Checklist Final

Antes de considerar el sistema estable:

- [ ] ✓ 10 compras de prueba exitosas
- [ ] ✓ Todos los webhooks recibidos y procesados
- [ ] ✓ Todas las suscripciones activadas
- [ ] ✓ Emails enviados correctamente
- [ ] ✓ Sin errores en logs de producción
- [ ] ✓ Tiempos de respuesta < 2s
- [ ] ✓ Configuración de MercadoPago verificada
- [ ] ✓ Pruebas de casos edge exitosas
- [ ] ✓ Monitoreo configurado

## Contacto de Soporte

Si algo no funciona:

1. **Revisar logs primero**: Vercel Logs o consola del navegador
2. **Verificar MercadoPago Dashboard**: Estado de pagos y webhooks
3. **Revisar base de datos**: Estado de suscripciones y pagos
4. **Documentación completa**: `/docs/WEBHOOK_FIXES.md`

## Notas Importantes

⚠️ **En Desarrollo**:
- Firma de webhook no es requerida (se acepta `test-signature-dev`)
- Se permiten más logs verbosos

⚠️ **En Producción**:
- Firma de webhook debe ser validada
- Logs más concisos
- Rate limiting activo
- HTTPS requerido

✅ **Best Practices**:
- Siempre usar external_reference consistente
- Nunca exponer tokens en logs
- Implementar idempotencia
- Monitorear métricas diarias
