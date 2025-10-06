# ✅ Checklist de Instalación - Sistema de Notificaciones

## Pre-requisitos

- [ ] Proyecto Next.js funcionando
- [ ] Supabase configurado
- [ ] Variables de entorno SMTP disponibles
- [ ] Acceso al dashboard de Supabase
- [ ] Git configurado

---

## Fase 1: Instalación de Base de Datos

### 1.1 Aplicar Migración SQL
- [ ] Abrir Supabase Dashboard
- [ ] Ir a SQL Editor
- [ ] Copiar contenido de `supabase/migrations/20250106_subscription_notifications.sql`
- [ ] Ejecutar el SQL
- [ ] Verificar que no hay errores

**Verificación:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'subscription_notifications'
) AS tabla_existe;
```
✅ Debe retornar: `tabla_existe: true`

### 1.2 Verificar Trigger
- [ ] Ejecutar query de verificación:
```sql
SELECT trigger_name 
FROM information_schema.triggers
WHERE trigger_name = 'trigger_log_subscription_status_change';
```
✅ Debe retornar: `trigger_log_subscription_status_change`

---

## Fase 2: Configuración de Entorno

### 2.1 Variables de Entorno (Local)
- [ ] Abrir `.env.local`
- [ ] Verificar/agregar:
```env
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu-contraseña
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"
ADMIN_EMAILS=contacto@petgourmet.mx
```

### 2.2 Variables de Entorno (Producción)
- [ ] Ir a Vercel Dashboard
- [ ] Seleccionar proyecto
- [ ] Settings → Environment Variables
- [ ] Agregar todas las variables SMTP
- [ ] Guardar cambios

---

## Fase 3: Pruebas Locales

### 3.1 Iniciar Servidor
- [ ] Ejecutar `npm run dev`
- [ ] Verificar que compila sin errores
- [ ] Servidor corriendo en http://localhost:3000

### 3.2 Prueba de Trigger
- [ ] En Supabase SQL Editor, ejecutar:
```sql
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE id = (SELECT id FROM unified_subscriptions LIMIT 1);
```
- [ ] Verificar notificación creada:
```sql
SELECT * FROM subscription_notifications 
ORDER BY created_at DESC LIMIT 1;
```
✅ Debe mostrar la notificación recién creada

### 3.3 Prueba de API
- [ ] Abrir terminal
- [ ] Ejecutar:
```bash
curl http://localhost:3000/api/admin/subscription-notifications
```
- [ ] Verificar respuesta JSON con stats

### 3.4 Prueba de Envío de Email
- [ ] Ejecutar:
```bash
curl -X POST http://localhost:3000/api/admin/subscription-notifications
```
- [ ] Revisar logs en consola
- [ ] Verificar email recibido
- [ ] Comprobar notificación marcada como enviada:
```sql
SELECT notification_sent, email_sent_at 
FROM subscription_notifications 
ORDER BY created_at DESC LIMIT 1;
```

---

## Fase 4: Despliegue a Producción

### 4.1 Commit y Push
- [ ] `git add .`
- [ ] `git commit -m "feat: Sistema de notificaciones de suscripciones por email"`
- [ ] `git push origin main`

### 4.2 Verificar Despliegue en Vercel
- [ ] Abrir Vercel Dashboard
- [ ] Verificar que el deploy se completó
- [ ] No hay errores de build
- [ ] Deployment exitoso

### 4.3 Verificar Cron Job
- [ ] En Vercel Dashboard → Settings → Cron Jobs
- [ ] Verificar que existe:
  - Path: `/api/admin/subscription-notifications`
  - Schedule: `*/5 * * * *`
  - Status: Active

---

## Fase 5: Validación en Producción

### 5.1 Prueba de API en Producción
- [ ] `curl https://tu-dominio.vercel.app/api/admin/subscription-notifications`
- [ ] Verificar respuesta JSON

### 5.2 Prueba de Trigger en Producción
- [ ] En Supabase (producción), cambiar estado de suscripción
- [ ] Verificar notificación creada
- [ ] Esperar máximo 5 minutos (cron job)
- [ ] Verificar email recibido

### 5.3 Verificar Logs
- [ ] `vercel logs --follow`
- [ ] Buscar líneas `[SUBSCRIPTION-NOTIFICATIONS]`
- [ ] Verificar procesamiento exitoso

---

## Fase 6: Monitoreo Post-Instalación

### 6.1 Primera Hora
- [ ] Verificar cron job se ejecuta cada 5 minutos
- [ ] Revisar logs de Vercel
- [ ] No hay errores en la consola
- [ ] Emails se están enviando

### 6.2 Primeras 24 Horas
- [ ] Ejecutar query de estadísticas:
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as enviados,
  SUM(CASE WHEN NOT notification_sent THEN 1 ELSE 0 END) as pendientes
FROM subscription_notifications
WHERE created_at >= NOW() - INTERVAL '24 hours';
```
- [ ] Verificar tasa de éxito > 95%
- [ ] No hay notificaciones con `retry_count >= 5`

### 6.3 Primera Semana
- [ ] Crear dashboard de monitoreo
- [ ] Configurar alertas si hay fallos
- [ ] Revisar feedback de usuarios sobre emails

---

## Troubleshooting

### Si el trigger no funciona:
- [ ] Verificar que el trigger existe (Fase 1.2)
- [ ] Revisar permisos de la función
- [ ] Verificar sintaxis SQL

### Si los emails no se envían:
- [ ] Verificar variables SMTP (Fase 2)
- [ ] Revisar logs de la aplicación
- [ ] Probar SMTP con herramienta externa
- [ ] Verificar límites del servidor SMTP

### Si el cron job no se ejecuta:
- [ ] Verificar configuración en Vercel Dashboard
- [ ] Confirmar que el plan de Vercel soporta cron jobs
- [ ] Revisar logs de cron job en Vercel

---

## Checklist Final

### Funcionalidad
- [ ] ✅ Trigger SQL activo
- [ ] ✅ Tabla `subscription_notifications` creada
- [ ] ✅ API endpoint funcionando (GET/POST)
- [ ] ✅ Cron job configurado y activo
- [ ] ✅ Emails se envían correctamente
- [ ] ✅ Reintentos funcionan
- [ ] ✅ Logs visibles en Vercel

### Documentación
- [ ] ✅ README principal actualizado
- [ ] ✅ Documentación técnica disponible
- [ ] ✅ Ejemplos documentados
- [ ] ✅ Scripts de prueba listos

### Producción
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Deploy exitoso en Vercel
- [ ] ✅ Cron job ejecutándose
- [ ] ✅ Emails enviándose automáticamente
- [ ] ✅ Sin errores en logs

---

## 🎉 ¡Sistema Completamente Operativo!

Si todos los checkboxes están marcados, el sistema está funcionando correctamente.

### Mantenimiento Recomendado:
- **Diario:** Revisar estadísticas de envío
- **Semanal:** Verificar notificaciones fallidas
- **Mensual:** Limpiar notificaciones antiguas

### Recursos:
- 📖 Documentación: `docs/SUBSCRIPTION_NOTIFICATIONS.md`
- 🧪 Ejemplos: `docs/SUBSCRIPTION_NOTIFICATIONS_EXAMPLES.md`
- 🔧 Tests: `supabase/test-subscription-notifications.sql`
- 📋 Resumen: `SUBSCRIPTION_NOTIFICATIONS_README.md`

---

**Última actualización:** Octubre 6, 2025  
**Versión:** 1.0.0
