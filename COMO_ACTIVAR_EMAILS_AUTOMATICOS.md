# 🚀 Cómo Activar Envío Automático de Emails

## 🎯 El Problema

Actualmente las notificaciones se crean automáticamente cuando cambia el estado de una suscripción (✅ esto funciona), pero los emails **NO se envían automáticamente** hasta que despliegues a producción.

## ✅ Solución 1: Desplegar a Producción (RECOMENDADO)

Esta es la solución definitiva. Una vez desplegado, TODO será automático.

### Pasos:

```bash
# 1. Commit de todos los cambios
git add .
git commit -m "feat: Sistema de notificaciones automáticas por email"

# 2. Push a producción
git push

# 3. Verificar en Vercel Dashboard
# El cron job se activará automáticamente y procesará emails cada 5 minutos
```

**Después del deploy:**
- ✅ Los emails se envían automáticamente cada 5 minutos
- ✅ No necesitas hacer nada más
- ✅ Funciona 24/7 sin intervención

---

## 🔧 Solución 2: Script de Monitoreo (Para Desarrollo)

Si necesitas que funcione automáticamente **en desarrollo local**, usa este script:

### Opción A: Script Automático (RECOMENDADO para desarrollo)

```powershell
# En una terminal, ejecuta:
npm run dev

# En OTRA terminal, ejecuta:
.\scripts\monitor-notifications.ps1
```

**Esto hará:**
- ✅ Monitorea notificaciones cada 30 segundos
- ✅ Procesa y envía emails automáticamente
- ✅ Muestra logs en tiempo real
- ⚠️ Debes mantener las 2 terminales abiertas

### Opción B: Procesar Manualmente

```powershell
# Verificar notificaciones pendientes
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json

# Procesar notificaciones pendientes
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method POST -UseBasicParsing
```

⚠️ **Importante:** Cambia el puerto si tu servidor usa 3001 u otro.

---

## 📋 Guía Rápida para Procesar Notificación Actual

Tu notificación #8 está pendiente. Para enviar el email AHORA:

### 1. Asegúrate que el servidor esté corriendo:
```powershell
npm run dev
```

### 2. En otra terminal, procesa la notificación:

**Si tu servidor está en puerto 3000:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method POST -UseBasicParsing
```

**Si tu servidor está en puerto 3001:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/admin/subscription-notifications" -Method POST -UseBasicParsing
```

### 3. Verifica que se envió:
```powershell
# Ver estadísticas
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

---

## 🎯 Comparación de Soluciones

| Solución | Automático | Requiere | Ideal para |
|----------|------------|----------|------------|
| **Desplegar a Producción** | ✅ 100% | Git push | Uso real |
| **Script de Monitoreo** | ✅ Mientras corra | 2 terminales | Desarrollo |
| **Procesar Manualmente** | ❌ No | Ejecutar comando | Pruebas |

---

## 📊 Verificar que Todo Funciona

### En Desarrollo (después de procesar):
```sql
-- En Supabase SQL Editor
SELECT 
  id,
  subscription_id,
  notification_sent,
  email_sent_at,
  error_message
FROM subscription_notifications
WHERE id = 8;
```

Debes ver:
- `notification_sent: true`
- `email_sent_at: [fecha actual]`
- `error_message: null`

### En Producción (después del deploy):
```bash
# Ver logs del cron job
vercel logs --follow

# Buscar líneas de notificaciones
vercel logs | grep "SUBSCRIPTION-NOTIFICATIONS"
```

---

## 🚨 Troubleshooting

### "No se puede conectar con el servidor"
- ✅ Verifica que `npm run dev` esté corriendo
- ✅ Confirma el puerto correcto (3000 o 3001)
- ✅ Revisa que no haya errores en la consola

### "Email no llega"
- ✅ Revisa spam/correo no deseado
- ✅ Verifica variables SMTP en `.env.local`
- ✅ Mira logs del servidor buscando `[EMAIL-SERVICE]`

### "Script de monitoreo no funciona"
- ✅ Asegúrate que el servidor esté corriendo primero
- ✅ Verifica permisos de ejecución de PowerShell
- ✅ Ejecuta desde la raíz del proyecto

---

## ✨ Recomendación Final

### Para Desarrollo:
```powershell
# Terminal 1
npm run dev

# Terminal 2
.\scripts\monitor-notifications.ps1
```

### Para Producción:
```bash
git push
# ¡Y listo! Todo automático
```

---

## 📞 Comandos Útiles

```powershell
# Ver notificaciones pendientes
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method GET -UseBasicParsing | ConvertFrom-Json | Select-Object -ExpandProperty stats

# Procesar TODAS las pendientes
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/subscription-notifications" -Method POST -UseBasicParsing

# Iniciar monitoreo automático
.\scripts\monitor-notifications.ps1
```

---

**💡 Lo más simple:** Haz el deploy a producción y olvídate del problema. El cron job lo hace todo automáticamente. 🚀
