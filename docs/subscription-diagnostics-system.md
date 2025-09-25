# Sistema de Diagnóstico y Monitoreo de Suscripciones

## Descripción General

Este sistema proporciona herramientas automáticas para diagnosticar, corregir y monitorear problemas en las suscripciones de usuarios, especialmente aquellos relacionados con la sincronización entre MercadoPago y la base de datos local.

## Componentes del Sistema

### 1. Utilidad de Diagnóstico (`utils/subscription-diagnostics.ts`)

#### Funciones Principales

- **`runSubscriptionDiagnostics(userId: string)`**: Ejecuta un diagnóstico completo de las suscripciones de un usuario
- **`applyAutomaticFixes(userId: string, issues: DiagnosticIssue[])`**: Aplica correcciones automáticas a los problemas detectados
- **`generateUserReport(diagnosticResult: DiagnosticResult)`**: Genera un reporte legible para el usuario

#### Tipos de Problemas Detectados

1. **Suscripciones Pendientes**: Suscripciones que deberían estar activas
2. **Suscripciones Duplicadas**: Múltiples suscripciones para el mismo producto
3. **Suscripciones Huérfanas**: Suscripciones sin referencia válida a productos
4. **Inconsistencias de Datos**: Discrepancias en external_reference, precios, etc.

#### Ejemplo de Uso

```typescript
import { runSubscriptionDiagnostics, applyAutomaticFixes } from '@/utils/subscription-diagnostics'

// Diagnosticar problemas de un usuario
const diagnosticResult = await runSubscriptionDiagnostics(userId)

if (diagnosticResult.issues.length > 0) {
  // Aplicar correcciones automáticas
  const fixResult = await applyAutomaticFixes(userId, diagnosticResult.issues)
  console.log(`Correcciones aplicadas: ${fixResult.fixesApplied}`)
}
```

### 2. Sistema de Monitoreo (`utils/subscription-monitor.ts`)

#### Características

- **Monitoreo Automático**: Ejecuta diagnósticos periódicos cada 30 minutos
- **Correcciones Automáticas**: Aplica fixes automáticamente cuando es posible
- **Alertas**: Notifica cuando se detectan muchos problemas
- **Configuración Flexible**: Permite ajustar intervalos y comportamientos

#### Configuración

```typescript
interface MonitoringConfig {
  enabled: boolean           // Habilitar/deshabilitar monitoreo
  intervalMinutes: number    // Intervalo entre ejecuciones (default: 30)
  autoFixEnabled: boolean    // Aplicar correcciones automáticas
  alertThreshold: number     // Umbral para alertas (default: 5)
  maxIssuesPerRun: number   // Máximo problemas por ejecución (default: 20)
}
```

#### Funciones de Control

```typescript
import { 
  startSubscriptionMonitoring,
  stopSubscriptionMonitoring,
  runManualSubscriptionCheck,
  updateMonitoringConfig,
  getMonitoringStatus
} from '@/utils/subscription-monitor'

// Iniciar monitoreo automático
startSubscriptionMonitoring()

// Ejecutar chequeo manual
const result = await runManualSubscriptionCheck()

// Actualizar configuración
updateMonitoringConfig({ intervalMinutes: 60, autoFixEnabled: false })
```

### 3. Integración en la Aplicación

#### Inicialización Automática

El sistema se inicializa automáticamente en `app/ClientLayout.tsx`:

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'production' || 
      process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION_MONITORING === 'true') {
    startSubscriptionMonitoring()
  }
}, [])
```

#### Diagnóstico en Tiempo Real

En `app/suscripcion/page.tsx`, se ejecuta diagnóstico automático antes de procesar suscripciones:

```typescript
// DIAGNÓSTICO AUTOMÁTICO: Ejecutar diagnóstico antes de procesar
const diagnosticResult = await runSubscriptionDiagnostics(user.id)

if (diagnosticResult.issues.length > 0) {
  // Aplicar correcciones automáticas si es posible
  const fixResult = await applyAutomaticFixes(user.id, diagnosticResult.issues)
  
  if (fixResult.fixesApplied > 0) {
    logger.info(LogCategory.SUBSCRIPTION, 'Correcciones automáticas aplicadas', {
      userId: user.id,
      fixesApplied: fixResult.fixesApplied
    })
  }
}
```

## Variables de Entorno

```env
# Habilitar monitoreo en desarrollo (opcional)
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_MONITORING=true
```

## Logs y Monitoreo

### Categorías de Logs

Todos los logs se registran bajo la categoría `LogCategory.SUBSCRIPTION`:

- **Info**: Operaciones normales, correcciones aplicadas
- **Warn**: Problemas detectados, alertas de umbral
- **Error**: Errores en diagnóstico o correcciones

### Ejemplos de Logs

```typescript
// Correcciones aplicadas
logger.info(LogCategory.SUBSCRIPTION, 'Correcciones automáticas aplicadas', {
  userId: 'user-123',
  fixesApplied: 2,
  issuesResolved: ['pending_subscription', 'duplicate_subscription']
})

// Alerta de muchos problemas
logger.warn(LogCategory.SUBSCRIPTION, 'Alerta: Alto número de problemas detectados', {
  issuesFound: 15,
  threshold: 5,
  usersScanned: 50
})
```

## Casos de Uso Comunes

### 1. Usuario Reporta Suscripción No Activa

```typescript
// Ejecutar diagnóstico manual
const diagnosticResult = await runSubscriptionDiagnostics(userId)
const report = generateUserReport(diagnosticResult)

// Mostrar reporte al usuario
console.log(report.summary)

// Aplicar correcciones si es necesario
if (diagnosticResult.issues.length > 0) {
  const fixResult = await applyAutomaticFixes(userId, diagnosticResult.issues)
}
```

### 2. Monitoreo Proactivo

El sistema ejecuta automáticamente:

1. **Escaneo de usuarios** con suscripciones activas/pendientes
2. **Diagnóstico individual** para cada usuario
3. **Aplicación de correcciones** automáticas cuando es posible
4. **Generación de alertas** si se detectan muchos problemas
5. **Logging detallado** de todas las operaciones

### 3. Debugging de Problemas de Sincronización

```typescript
// Ejecutar diagnóstico detallado
const diagnosticResult = await runSubscriptionDiagnostics(userId)

// Revisar problemas específicos
diagnosticResult.issues.forEach(issue => {
  console.log(`Problema: ${issue.type}`)
  console.log(`Descripción: ${issue.description}`)
  console.log(`Datos: ${JSON.stringify(issue.data)}`)
})
```

## Mantenimiento y Configuración

### Ajustar Frecuencia de Monitoreo

```typescript
// Cambiar a monitoreo cada hora
updateMonitoringConfig({ intervalMinutes: 60 })

// Deshabilitar correcciones automáticas
updateMonitoringConfig({ autoFixEnabled: false })
```

### Verificar Estado del Sistema

```typescript
const status = getMonitoringStatus()
console.log('Monitoreo activo:', status.isRunning)
console.log('Configuración:', status.config)
```

### Detener Monitoreo (si es necesario)

```typescript
stopSubscriptionMonitoring()
```

## Consideraciones de Rendimiento

1. **Límite de Procesamiento**: Máximo 20 problemas por ejecución para evitar sobrecarga
2. **Intervalo Configurable**: Default 30 minutos, ajustable según necesidades
3. **Procesamiento Asíncrono**: No bloquea la interfaz de usuario
4. **Manejo de Errores**: Continúa funcionando aunque falle en usuarios específicos

## Seguridad

1. **Validación de Permisos**: Solo procesa suscripciones del usuario autenticado
2. **Logs Seguros**: No registra información sensible como tokens de pago
3. **Transacciones Atómicas**: Las correcciones se aplican de forma segura
4. **Idempotencia**: Las operaciones pueden ejecutarse múltiples veces sin efectos adversos

## Troubleshooting

### Problema: Monitoreo No Se Inicia

**Solución**: Verificar variables de entorno y logs de consola

```typescript
// Verificar estado
const status = getMonitoringStatus()
if (!status.isRunning) {
  startSubscriptionMonitoring()
}
```

### Problema: Muchas Correcciones Fallidas

**Solución**: Revisar logs de errores y ajustar configuración

```typescript
// Reducir carga de trabajo
updateMonitoringConfig({ maxIssuesPerRun: 10 })

// Deshabilitar auto-corrección temporalmente
updateMonitoringConfig({ autoFixEnabled: false })
```

### Problema: Alertas Excesivas

**Solución**: Ajustar umbral de alertas

```typescript
// Aumentar umbral de alertas
updateMonitoringConfig({ alertThreshold: 10 })
```

## Próximas Mejoras

1. **Dashboard de Monitoreo**: Interfaz visual para ver estadísticas
2. **Notificaciones por Email**: Alertas automáticas por correo
3. **Métricas Avanzadas**: Análisis de tendencias y patrones
4. **API de Diagnóstico**: Endpoints para diagnóstico remoto
5. **Integración con Webhooks**: Procesamiento en tiempo real de eventos de MercadoPago

---

**Nota**: Este sistema está diseñado para ser robusto y auto-recuperable. En caso de dudas o problemas, revisar los logs de la aplicación bajo la categoría `SUBSCRIPTION`.