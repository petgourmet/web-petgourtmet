# 📅 Documentación de Trabajos Cron - PetGourmet

## 🎯 Propósito

Este documento describe los trabajos cron configurados en Vercel para automatizar tareas críticas del sistema de suscripciones y pagos de PetGourmet.

---

## 🔄 Trabajos Cron Configurados

### 📋 Resumen de Configuración

| Trabajo | Endpoint | Frecuencia | Descripción |
|---------|----------|------------|-------------|
| **Validación de Pagos** | `/api/cron/validate-payments` | Cada 6 horas | Valida y sincroniza pagos pendientes |
| **Procesamiento de Suscripciones** | `/api/cron/process-subscriptions` | Cada 12 horas | Procesa suscripciones pendientes |
| **Pagos de Suscripciones** | `/api/cron/subscription-payments` | Diario a las 2:00 AM UTC | Procesa pagos recurrentes |

---

## 🕐 Programación Detallada

### 1. 💳 **Validación de Pagos**
```json
{
  "path": "/api/cron/validate-payments",
  "schedule": "0 */6 * * *"
}
```

**Frecuencia:** Cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)

**Propósito:**
- Verificar pagos pendientes en MercadoPago
- Sincronizar estados de órdenes
- Actualizar registros de facturación
- Detectar pagos fallidos o rechazados

**Duración Máxima:** 5 minutos (300 segundos)

### 2. 🔄 **Procesamiento de Suscripciones**
```json
{
  "path": "/api/cron/process-subscriptions",
  "schedule": "0 */12 * * *"
}
```

**Frecuencia:** Cada 12 horas (00:00, 12:00 UTC)

**Propósito:**
- Procesar suscripciones pendientes
- Activar suscripciones aprobadas
- Limpiar suscripciones expiradas
- Enviar notificaciones de estado

**Duración Máxima:** 5 minutos (300 segundos)

### 3. 💰 **Pagos de Suscripciones**
```json
{
  "path": "/api/cron/subscription-payments",
  "schedule": "0 2 * * *"
}
```

**Frecuencia:** Diario a las 2:00 AM UTC

**Propósito:**
- Procesar pagos recurrentes diarios
- Actualizar fechas de próximo cobro
- Manejar pagos fallidos
- Generar reportes de facturación

**Duración Máxima:** 5 minutos (300 segundos)

---

## 🔧 Configuración Técnica

### 📄 Archivo `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/validate-payments",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/subscription-payments",
      "schedule": "0 2 * * *"
    }
  ],
  "functions": {
    "app/api/cron/validate-payments/route.ts": {
      "maxDuration": 300
    },
    "app/api/cron/process-subscriptions/route.ts": {
      "maxDuration": 300
    },
    "app/api/cron/subscription-payments/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### 🔍 Validación de Expresiones Cron

| Expresión | Descripción | Próximas Ejecuciones (UTC) |
|-----------|-------------|-----------------------------|
| `0 */6 * * *` | Cada 6 horas | 00:00, 06:00, 12:00, 18:00 |
| `0 */12 * * *` | Cada 12 horas | 00:00, 12:00 |
| `0 2 * * *` | Diario a las 2:00 AM | 02:00 todos los días |

---

## 🛡️ Seguridad y Autenticación

### 🔐 Verificación de Origen

Todos los endpoints de cron verifican que la solicitud provenga de Vercel:

```typescript
// Verificar User-Agent de Vercel Cron
const userAgent = request.headers.get('user-agent')
if (!userAgent?.includes('vercel-cron/1.0')) {
  return NextResponse.json(
    { error: 'Unauthorized' }, 
    { status: 401 }
  )
}
```

### 🔑 Variables de Entorno Requeridas

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT`

---

## 📊 Monitoreo y Logs

### 📈 Métricas a Monitorear

1. **Tasa de Éxito:**
   - Porcentaje de ejecuciones exitosas
   - Tiempo promedio de ejecución
   - Errores por tipo

2. **Rendimiento:**
   - Duración de cada trabajo
   - Uso de memoria
   - Número de registros procesados

3. **Negocio:**
   - Pagos validados por hora
   - Suscripciones procesadas
   - Errores de facturación

### 🔍 Logs Estructurados

Cada trabajo cron genera logs estructurados:

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  job: 'validate-payments',
  status: 'success',
  processed: 25,
  duration: 1200,
  errors: 0
}))
```

---

## 🚨 Manejo de Errores

### ⚠️ Estrategias de Recuperación

1. **Reintentos Automáticos:**
   - Máximo 3 intentos por operación
   - Backoff exponencial
   - Logging detallado de errores

2. **Notificaciones de Fallo:**
   - Alertas por email para errores críticos
   - Logs en Vercel Dashboard
   - Métricas en tiempo real

3. **Degradación Elegante:**
   - Continuar procesando otros registros
   - Marcar elementos fallidos para revisión manual
   - Reportar estadísticas de éxito/fallo

### 🔧 Debugging

```bash
# Ver logs de trabajos cron en Vercel
vercel logs --follow

# Filtrar por función específica
vercel logs --follow --function=api/cron/validate-payments
```

---

## 🧪 Testing Local

### 🔄 Ejecutar Trabajos Manualmente

```bash
# Validación de pagos
curl http://localhost:3000/api/cron/validate-payments

# Procesamiento de suscripciones
curl http://localhost:3000/api/cron/process-subscriptions

# Pagos de suscripciones
curl http://localhost:3000/api/cron/subscription-payments
```

### 📋 Checklist de Testing

- [ ] Verificar autenticación de User-Agent
- [ ] Probar con datos de prueba
- [ ] Validar manejo de errores
- [ ] Confirmar logs estructurados
- [ ] Verificar duración < 5 minutos

---

## 📅 Mantenimiento

### 🔄 Actualizaciones Regulares

1. **Mensual:**
   - Revisar métricas de rendimiento
   - Optimizar consultas lentas
   - Actualizar documentación

2. **Trimestral:**
   - Evaluar frecuencias de ejecución
   - Revisar estrategias de error
   - Actualizar alertas

3. **Anual:**
   - Auditoría completa de seguridad
   - Revisión de arquitectura
   - Optimización de costos

### 📊 KPIs Importantes

| Métrica | Objetivo | Alerta |
|---------|----------|--------|
| Tasa de éxito | > 99% | < 95% |
| Duración promedio | < 2 min | > 4 min |
| Errores por día | < 5 | > 20 |
| Pagos procesados | > 95% | < 90% |

---

## 🔗 Referencias

- [Documentación de Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Expresiones Cron - Crontab Guru](https://crontab.guru/)
- [Documentación de MercadoPago API](https://www.mercadopago.com.mx/developers/)
- [Documentación de Supabase](https://supabase.com/docs)

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|----------|
| 2025-08-19 | 1.0 | Configuración inicial de trabajos cron |

---

**🎯 Los trabajos cron están diseñados para mantener el sistema de suscripciones funcionando de manera autónoma y confiable, procesando pagos y suscripciones sin intervención manual.**