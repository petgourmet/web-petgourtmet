# Plan de Implementación: Sistema de Webhooks y Tiempo Real Mejorado

## 1. Resumen Ejecutivo

Este documento detalla el plan de implementación para mejorar el sistema de webhooks de MercadoPago y la sincronización en tiempo real en la plataforma PetGourmet. La implementación se realizará en 4 fases principales durante un período de 6-8 semanas, priorizando la estabilidad y minimizando el impacto en el sistema actual.

## 2. Objetivos del Proyecto

### 2.1 Objetivos Principales
- ✅ Garantizar actualización en tiempo real de estados de pago en órdenes
- ✅ Implementar seguimiento completo de suscripciones con frecuencia y recurrencia
- ✅ Mejorar la confiabilidad del procesamiento de webhooks (>99% éxito)
- ✅ Proporcionar herramientas de monitoreo y validación para administradores
- ✅ Reducir discrepancias entre MercadoPago y base de datos local

### 2.2 Métricas de Éxito
- **Tiempo de sincronización**: < 5 segundos
- **Tasa de éxito de webhooks**: > 99%
- **Órdenes desincronizadas**: < 1%
- **Tiempo de respuesta del panel**: < 2 segundos
- **Satisfacción del administrador**: > 90%

## 3. Análisis de Riesgos

### 3.1 Riesgos Técnicos
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de webhooks durante migración | Media | Alto | Implementar sistema de respaldo y validación |
| Problemas de rendimiento con tiempo real | Baja | Medio | Pruebas de carga y optimización de consultas |
| Incompatibilidad con versión actual de MercadoPago | Baja | Alto | Validación exhaustiva en ambiente de pruebas |
| Corrupción de datos durante migración | Baja | Alto | Backups completos y rollback plan |

### 3.2 Riesgos de Negocio
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Interrupción del servicio durante implementación | Media | Alto | Implementación en horarios de bajo tráfico |
| Resistencia del equipo a nuevas herramientas | Baja | Medio | Capacitación y documentación completa |
| Retrasos en cronograma | Media | Medio | Buffer de tiempo y priorización clara |

## 4. Fases de Implementación

### Fase 1: Preparación y Base de Datos (Semanas 1-2)

#### 4.1.1 Objetivos de la Fase
- Preparar la base de datos con nuevas tablas y campos
- Implementar sistema de logging de webhooks
- Crear respaldos y plan de rollback

#### 4.1.2 Tareas Específicas

**Semana 1: Preparación de Base de Datos**
- [ ] **Día 1-2**: Crear backup completo de la base de datos actual
- [ ] **Día 2-3**: Ejecutar scripts DDL para nuevas tablas:
  - `payment_history`
  - `webhook_logs`
  - `realtime_notifications`
- [ ] **Día 3-4**: Agregar campos adicionales a tablas existentes:
  - `orders`: `payment_method_details`, `payment_approved_at`, `webhook_status`, `last_webhook_at`
  - `user_subscriptions`: `total_charges`, `subscription_details`, `webhook_status`, `last_webhook_at`
- [ ] **Día 4-5**: Crear índices optimizados para consultas rápidas
- [ ] **Día 5**: Configurar permisos de Supabase y habilitar Realtime

**Semana 2: Sistema de Logging**
- [ ] **Día 1-2**: Implementar `WebhookLogger` service
- [ ] **Día 2-3**: Modificar endpoint actual para registrar todos los webhooks
- [ ] **Día 3-4**: Crear funciones de base de datos para limpieza automática
- [ ] **Día 4-5**: Implementar sistema de alertas básico
- [ ] **Día 5**: Pruebas de logging en ambiente de desarrollo

#### 4.1.3 Criterios de Aceptación
- ✅ Todas las tablas nuevas creadas correctamente
- ✅ Campos adicionales agregados sin afectar funcionalidad actual
- ✅ Sistema de logging registra todos los webhooks entrantes
- ✅ Permisos de Supabase configurados correctamente
- ✅ Pruebas de rollback exitosas

### Fase 2: Mejora del WebhookService (Semanas 3-4)

#### 4.2.1 Objetivos de la Fase
- Mejorar el procesamiento de webhooks de pagos
- Implementar procesamiento completo de suscripciones
- Agregar validación y manejo de errores robusto

#### 4.2.2 Tareas Específicas

**Semana 3: Mejora de Procesamiento de Pagos**
- [ ] **Día 1-2**: Refactorizar `handleOrderPayment` para incluir:
  - Registro en `payment_history`
  - Actualización de `payment_method_details`
  - Timestamp de `payment_approved_at`
- [ ] **Día 2-3**: Mejorar `handleSubscriptionPayment` para:
  - Actualizar `total_charges`
  - Calcular `next_payment_date` correctamente
  - Registrar en `subscription_billing_history`
- [ ] **Día 3-4**: Implementar validación de firmas mejorada
- [ ] **Día 4-5**: Agregar manejo de reintentos automáticos
- [ ] **Día 5**: Pruebas unitarias para todos los métodos

**Semana 4: Procesamiento de Suscripciones**
- [ ] **Día 1-2**: Implementar procesamiento completo de webhooks de suscripción:
  - `subscription.created`
  - `subscription.updated` 
  - `subscription.cancelled`
  - `subscription.paused`
- [ ] **Día 2-3**: Agregar sincronización bidireccional con MercadoPago API
- [ ] **Día 3-4**: Implementar detección de discrepancias automática
- [ ] **Día 4-5**: Crear sistema de notificaciones por email mejorado
- [ ] **Día 5**: Pruebas de integración con MercadoPago sandbox

#### 4.2.3 Criterios de Aceptación
- ✅ Webhooks de pago actualizan correctamente todos los campos
- ✅ Suscripciones se sincronizan completamente con MercadoPago
- ✅ Sistema detecta y reporta discrepancias automáticamente
- ✅ Tasa de éxito de procesamiento > 95%
- ✅ Tiempo de procesamiento promedio < 500ms

### Fase 3: Tiempo Real y Notificaciones (Semanas 5-6)

#### 4.3.1 Objetivos de la Fase
- Implementar `RealtimeService` para notificaciones instantáneas
- Mejorar interfaces de administración con actualizaciones en tiempo real
- Crear sistema de notificaciones para administradores

#### 4.3.2 Tareas Específicas

**Semana 5: RealtimeService**
- [ ] **Día 1-2**: Crear `RealtimeService` con métodos:
  - `sendNotification()`
  - `broadcastOrderUpdate()`
  - `broadcastSubscriptionUpdate()`
  - `createUserNotification()`
- [ ] **Día 2-3**: Integrar RealtimeService en WebhookService
- [ ] **Día 3-4**: Configurar canales de Supabase Realtime específicos:
  - `orders_updates`
  - `subscriptions_updates`
  - `admin_notifications`
- [ ] **Día 4-5**: Implementar sistema de notificaciones toast
- [ ] **Día 5**: Pruebas de tiempo real en múltiples navegadores

**Semana 6: Mejora de Interfaces**
- [ ] **Día 1-2**: Actualizar `/admin/orders` con:
  - Suscripción a cambios en tiempo real
  - Notificaciones toast para nuevas órdenes
  - Indicadores visuales de estado actualizado
- [ ] **Día 2-3**: Mejorar `/admin/orders/[id]` con:
  - Actualización automática de estado de pago
  - Historial de webhooks en tiempo real
  - Botón de revalidación manual
- [ ] **Día 3-4**: Actualizar `/admin/subscription-orders` con:
  - Estados de suscripción en tiempo real
  - Próximos pagos actualizados automáticamente
  - Notificaciones de cambios de estado
- [ ] **Día 4-5**: Implementar sistema de sonidos opcionales
- [ ] **Día 5**: Pruebas de usabilidad con administradores

#### 4.3.3 Criterios de Aceptación
- ✅ Cambios de estado se reflejan en < 5 segundos
- ✅ Notificaciones aparecen correctamente en todas las páginas
- ✅ Sistema funciona con múltiples usuarios simultáneos
- ✅ No hay pérdida de notificaciones durante reconexiones
- ✅ Interfaz permanece responsive durante actualizaciones

### Fase 4: Monitoreo y Validación (Semanas 7-8)

#### 4.4.1 Objetivos de la Fase
- Crear dashboard de monitoreo de webhooks
- Implementar herramientas de validación y sincronización manual
- Finalizar documentación y capacitación

#### 4.4.2 Tareas Específicas

**Semana 7: Dashboard de Monitoreo**
- [ ] **Día 1-2**: Crear `/admin/webhook-monitor` con:
  - Estadísticas de webhooks en tiempo real
  - Gráficos de tasa de éxito
  - Lista de webhooks fallidos
  - Alertas automáticas
- [ ] **Día 2-3**: Implementar API endpoints:
  - `/api/admin/webhook-monitor/stats`
  - `/api/admin/webhook-monitor/alerts`
  - `/api/admin/webhook-monitor/failed-webhooks`
- [ ] **Día 3-4**: Crear sistema de alertas automáticas:
  - Email cuando tasa de éxito < 95%
  - Notificación cuando hay > 5 webhooks fallidos
  - Alerta de órdenes desincronizadas
- [ ] **Día 4-5**: Implementar dashboard responsive
- [ ] **Día 5**: Pruebas de monitoreo con datos reales

**Semana 8: Validación y Finalización**
- [ ] **Día 1-2**: Crear `/admin/payment-validation` con:
  - Validación masiva de órdenes
  - Sincronización manual individual
  - Reporte de discrepancias
  - Herramientas de corrección
- [ ] **Día 2-3**: Implementar `ValidationService` completo:
  - `validateOrder()`
  - `validateAllPendingOrders()`
  - `syncOrderWithMercadoPago()`
  - `generateDiscrepancyReport()`
- [ ] **Día 3-4**: Crear documentación técnica completa
- [ ] **Día 4-5**: Capacitación del equipo de administración
- [ ] **Día 5**: Pruebas finales y go-live

#### 4.4.3 Criterios de Aceptación
- ✅ Dashboard muestra métricas precisas en tiempo real
- ✅ Herramientas de validación detectan y corrigen discrepancias
- ✅ Sistema de alertas funciona correctamente
- ✅ Documentación completa y actualizada
- ✅ Equipo capacitado en nuevas herramientas

## 5. Configuración Técnica

### 5.1 Variables de Entorno Requeridas

```env
# MercadoPago Configuration
MERCADOPAGO_ACCESS_TOKEN=your_access_token
MERCADOPAGO_WEBHOOK_SECRET=your_webhook_secret
MERCADOPAGO_PUBLIC_KEY=your_public_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Realtime Configuration
REALTIME_ENABLED=true
REALTIME_CHANNELS=orders_updates,subscriptions_updates,admin_notifications

# Webhook Configuration
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000
WEBHOOK_TIMEOUT_MS=30000

# Notification Configuration
EMAIL_SERVICE_PROVIDER=resend
EMAIL_API_KEY=your_email_api_key
EMAIL_FROM_ADDRESS=noreply@petgourmet.com

# Monitoring Configuration
ALERT_EMAIL_RECIPIENTS=admin@petgourmet.com,tech@petgourmet.com
ALERT_WEBHOOK_FAILURE_THRESHOLD=5
ALERT_SUCCESS_RATE_THRESHOLD=95

# Validation Configuration
VALIDATION_BATCH_SIZE=50
VALIDATION_RATE_LIMIT_MS=100
AUTO_SYNC_ENABLED=true
```

### 5.2 Configuración de Supabase

**Políticas de Seguridad (RLS)**
```sql
-- Política para webhook_logs (solo lectura para authenticated)
CREATE POLICY "webhook_logs_read_policy" ON webhook_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para payment_history (solo lectura para authenticated)
CREATE POLICY "payment_history_read_policy" ON payment_history
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para realtime_notifications
CREATE POLICY "realtime_notifications_policy" ON realtime_notifications
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid() OR auth.role() = 'service_role')
    );
```

**Configuración de Realtime**
```sql
-- Habilitar realtime para tablas específicas
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_history;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_notifications;
```

### 5.3 Configuración de MercadoPago

**Webhooks a Configurar**
- URL: `https://tu-dominio.com/api/mercadopago/webhook`
- Eventos:
  - `payment` (created, updated)
  - `subscription_preapproval` (created, updated, cancelled)
  - `subscription_authorized_payment` (created, updated)
  - `invoice` (created, updated, paid, cancelled)

## 6. Plan de Pruebas

### 6.1 Pruebas Unitarias
- [ ] WebhookService methods
- [ ] RealtimeService methods
- [ ] ValidationService methods
- [ ] Database functions
- [ ] API endpoints

### 6.2 Pruebas de Integración
- [ ] Flujo completo de webhook de pago
- [ ] Flujo completo de webhook de suscripción
- [ ] Sincronización con MercadoPago API
- [ ] Notificaciones en tiempo real
- [ ] Sistema de alertas

### 6.3 Pruebas de Rendimiento
- [ ] Carga de webhooks simultáneos (100 req/s)
- [ ] Tiempo de respuesta de APIs
- [ ] Rendimiento de consultas de base de datos
- [ ] Memoria y CPU durante picos de tráfico

### 6.4 Pruebas de Usuario
- [ ] Usabilidad del panel de administración
- [ ] Funcionalidad de notificaciones
- [ ] Herramientas de validación
- [ ] Dashboard de monitoreo

## 7. Plan de Rollback

### 7.1 Escenarios de Rollback
1. **Fallo crítico en webhooks**: Revertir a versión anterior del WebhookService
2. **Problemas de rendimiento**: Deshabilitar tiempo real temporalmente
3. **Corrupción de datos**: Restaurar desde backup y resincronizar
4. **Fallo de integración**: Usar modo de validación manual

### 7.2 Procedimiento de Rollback
1. **Inmediato** (< 5 minutos):
   - Deshabilitar nuevos webhooks
   - Revertir código a versión estable
   - Activar modo de emergencia

2. **Corto plazo** (< 30 minutos):
   - Restaurar base de datos desde backup
   - Validar integridad de datos
   - Resincronizar órdenes críticas

3. **Largo plazo** (< 2 horas):
   - Análisis completo del problema
   - Corrección de datos inconsistentes
   - Validación masiva con MercadoPago

## 8. Capacitación y Documentación

### 8.1 Documentación Técnica
- [ ] Guía de instalación y configuración
- [ ] Documentación de APIs
- [ ] Guía de troubleshooting
- [ ] Procedimientos de monitoreo
- [ ] Plan de mantenimiento

### 8.2 Documentación de Usuario
- [ ] Manual del panel de administración
- [ ] Guía de uso de herramientas de validación
- [ ] Interpretación de alertas y notificaciones
- [ ] Procedimientos de emergencia

### 8.3 Sesiones de Capacitación
- [ ] **Sesión 1**: Nuevas funcionalidades del panel (2 horas)
- [ ] **Sesión 2**: Herramientas de monitoreo y validación (1.5 horas)
- [ ] **Sesión 3**: Procedimientos de emergencia (1 hora)
- [ ] **Sesión 4**: Q&A y casos prácticos (1 hora)

## 9. Métricas y Monitoreo Post-Implementación

### 9.1 KPIs Técnicos
- **Tasa de éxito de webhooks**: > 99%
- **Tiempo de procesamiento promedio**: < 500ms
- **Tiempo de sincronización**: < 5 segundos
- **Uptime del sistema**: > 99.9%
- **Órdenes desincronizadas**: < 1%

### 9.2 KPIs de Negocio
- **Tiempo de resolución de discrepancias**: Reducción del 80%
- **Satisfacción del equipo de admin**: > 90%
- **Errores reportados por usuarios**: Reducción del 90%
- **Tiempo de respuesta a problemas**: < 15 minutos

### 9.3 Alertas Automáticas
- Tasa de éxito de webhooks < 95%
- Más de 5 webhooks fallidos en 1 hora
- Tiempo de procesamiento > 2 segundos
- Más de 10 órdenes desincronizadas
- Sistema de tiempo real desconectado > 5 minutos

## 10. Cronograma Resumido

| Semana | Fase | Actividades Principales | Entregables |
|--------|------|------------------------|-------------|
| 1 | Preparación | Base de datos, backups | Tablas nuevas, índices |
| 2 | Preparación | Sistema de logging | WebhookLogger funcional |
| 3 | WebhookService | Mejora procesamiento pagos | Pagos sincronizados |
| 4 | WebhookService | Procesamiento suscripciones | Suscripciones completas |
| 5 | Tiempo Real | RealtimeService | Notificaciones instantáneas |
| 6 | Tiempo Real | Interfaces mejoradas | Paneles actualizados |
| 7 | Monitoreo | Dashboard de webhooks | Monitor funcional |
| 8 | Validación | Herramientas de validación | Sistema completo |

## 11. Recursos Necesarios

### 11.1 Equipo Técnico
- **Desarrollador Full-Stack Senior** (8 semanas, 100%)
- **Desarrollador Frontend** (4 semanas, 50%)
- **DevOps/DBA** (2 semanas, 25%)
- **QA Tester** (3 semanas, 50%)

### 11.2 Recursos de Infraestructura
- Ambiente de desarrollo/staging
- Acceso a MercadoPago sandbox
- Herramientas de monitoreo
- Servicios de backup

### 11.3 Presupuesto Estimado
- **Desarrollo**: 320 horas × $50/hora = $16,000
- **Infraestructura**: $500/mes × 2 meses = $1,000
- **Herramientas y servicios**: $300
- **Contingencia (10%)**: $1,730
- **Total**: $19,030

Este plan de implementación garantiza una transición suave hacia el nuevo sistema de webhooks mejorado, minimizando riesgos y maximizando la confiabilidad del sistema.