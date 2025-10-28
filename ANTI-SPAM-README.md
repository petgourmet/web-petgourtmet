# 🛡️ Sistema Anti-Spam - Guía de Uso

## 🎯 Resumen Rápido

El sistema anti-spam de Petgourmet implementa **8 capas de protección** para prevenir el envío de spam a través de los formularios de contacto y newsletter.

### Capas de Protección:

1. ✅ **Bloqueo de IPs** - IPs maliciosas bloqueadas automáticamente
2. ✅ **Honeypot** - Campo oculto para detectar bots
3. ✅ **reCAPTCHA v3** - Verificación de Google con score mínimo
4. ✅ **Rate Limiting** - Límite de envíos por tiempo
5. ✅ **Validación de Email** - Bloqueo de emails temporales/desechables
6. ✅ **Detección de Spam** - Patrones avanzados de contenido spam
7. ✅ **Validación de Tiempo** - Tiempo mínimo antes de enviar
8. ✅ **Logging y Monitoreo** - Registro completo de actividad sospechosa

---

## 🚀 Configuración Inicial

### 1. Variables de Entorno

Copia el archivo de ejemplo y configura tus valores:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
# reCAPTCHA v3 (obtener en https://www.google.com/recaptcha/admin)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_site_key_aqui
RECAPTCHA_SECRET_KEY=tu_secret_key_aqui

# URL de tu aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Desarrollo
# NEXT_PUBLIC_APP_URL=https://petgourmet.mx  # Producción

# Rate Limiting (opcional - valores por defecto ya configurados)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=10
```

### 2. Obtener Claves de reCAPTCHA v3

1. Ve a [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Crea un nuevo sitio con **reCAPTCHA v3**
3. Agrega tus dominios:
   - `localhost` (para desarrollo)
   - `petgourmet.mx` (producción)
4. Copia las claves generadas a tu `.env.local`

### 3. Instalar Dependencias

```bash
pnpm install
```

### 4. Iniciar Servidor de Desarrollo

```bash
pnpm dev
```

---

## 🧪 Probar el Sistema

### Método 1: Script de Prueba Automatizado

```bash
# Asegúrate de que el servidor esté corriendo
pnpm dev

# En otra terminal, ejecuta los tests
node scripts/test-anti-spam.js
```

Este script probará automáticamente:
- ✅ Detección de honeypot
- ✅ Validación de reCAPTCHA
- ✅ Detección de contenido spam
- ✅ Bloqueo de emails temporales
- ✅ Rate limiting

### Método 2: Prueba Manual en el Navegador

#### Probar Honeypot:
1. Abre las DevTools del navegador (F12)
2. Ve a la consola
3. Ejecuta:
```javascript
// Encontrar el formulario
const form = document.querySelector('form')
// Activar el honeypot (campo oculto)
const honeypot = form.querySelector('[name="website"]')
if (honeypot) honeypot.value = 'bot detected'
// Enviar formulario
form.submit()
```
**Resultado esperado:** Debería mostrar éxito pero NO enviar email real.

#### Probar Tiempo Mínimo:
1. Carga la página de contacto
2. Intenta enviar el formulario **inmediatamente** (< 3 segundos)
**Resultado esperado:** Mensaje de error pidiendo esperar.

#### Probar Contenido Spam:
1. En el mensaje del formulario, escribe:
```
Click here to win free viagra and casino money!
```
**Resultado esperado:** Error de "Contenido no permitido detectado"

#### Probar Email Temporal:
1. Intenta suscribirte al newsletter con:
```
test@tempmail.com
```
**Resultado esperado:** Error de "Dominio de email no permitido"

#### Probar Rate Limiting:
1. Envía el formulario de contacto 5 veces seguidas
**Resultado esperado:** A partir del 4to intento, debería mostrar error de "Demasiados mensajes enviados"

---

## 📊 Monitoreo y Logs

### Ver Logs en Desarrollo

Los eventos de seguridad se muestran en la consola del servidor:

```bash
[SECURITY HIGH] {
  ip: '127.0.0.1',
  endpoint: '/api/contact',
  action: 'honeypot_triggered',
  blocked: true
}
```

### Niveles de Severidad:
- 🟢 **LOW** - Actividad normal
- 🟡 **MEDIUM** - Sospechoso, requiere atención
- 🟠 **HIGH** - Muy sospechoso, bloqueado
- 🔴 **CRITICAL** - Ataque en curso, alerta inmediata

### Ver IPs Bloqueadas

Las IPs bloqueadas se almacenan temporalmente en memoria. Para ver el estado:

```javascript
// En el código del servidor
import { getBlockedIPs } from '@/lib/security/ip-blocker'

const blocked = getBlockedIPs()
console.log(blocked)
```

---

## 🔧 Configuración Avanzada

### Ajustar Severidad de Bloqueo

Edita `lib/security/ip-blocker.ts`:

```typescript
const BLOCK_CONFIG = {
  // Duraciones de bloqueo
  lowSeverity: 5 * 60 * 1000,        // 5 minutos
  mediumSeverity: 30 * 60 * 1000,    // 30 minutos
  highSeverity: 24 * 60 * 60 * 1000, // 24 horas
  
  // Umbrales para bloqueo
  violationThresholds: {
    spam: 2,           // Cambiar a 3 para ser más tolerante
    honeypot: 1,       // Mantener en 1 (bloqueo inmediato)
    lowRecaptcha: 3,   // Cambiar a 5 para ser más tolerante
    rateLimit: 5,      // Cambiar a 10 para ser más tolerante
  }
}
```

### Agregar Nuevos Patrones de Spam

Edita `hooks/useAntiSpam.ts`:

```typescript
const SPAM_PATTERNS = [
  // Agregar tus propios patrones
  /\b(palabra_spam|otra_palabra)\b/i,
  // ...existentes
]
```

### Modificar Scores Mínimos de reCAPTCHA

En las rutas API (`app/api/contact/route.ts`):

```typescript
// Cambiar de 0.5 a 0.3 para ser más tolerante
if (!recaptchaResult.success || recaptchaResult.score < 0.3) {
  // ...
}
```

**Recomendaciones de scores:**
- 0.9+ → Definitivamente humano
- 0.7-0.8 → Muy probablemente humano
- 0.5-0.6 → Incierto, revisar otros factores
- 0.3-0.4 → Probablemente bot
- 0.0-0.2 → Definitivamente bot

### Desbloquear IP Manualmente

```typescript
import { unblockIP } from '@/lib/security/ip-blocker'

// Desbloquear una IP específica
unblockIP('192.168.1.100')
```

---

## 🐛 Solución de Problemas

### Problema: "Verificación de seguridad fallida"

**Causas posibles:**
1. Claves de reCAPTCHA incorrectas
2. Dominio no agregado en configuración de reCAPTCHA
3. reCAPTCHA v2 en lugar de v3

**Solución:**
1. Verifica tus claves en `.env.local`
2. Asegúrate de usar reCAPTCHA **v3** (no v2)
3. Agrega `localhost` y tu dominio en Google reCAPTCHA Admin

### Problema: Rate limiting demasiado estricto en desarrollo

**Solución temporal:**
Aumenta los límites en desarrollo:

```typescript
// lib/security/rate-limiter.ts
const RATE_LIMIT_CONFIG = {
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
}
```

### Problema: IP bloqueada injustamente

**Solución:**
Las IPs se desbloquean automáticamente después del tiempo configurado. Para desbloquear inmediatamente, ver sección "Desbloquear IP Manualmente".

### Problema: Los formularios no se envían

**Verificar:**
1. ✅ reCAPTCHA está cargado (ver consola del navegador)
2. ✅ Tiempo mínimo ha pasado (esperar 3-5 segundos)
3. ✅ No hay contenido spam en el mensaje
4. ✅ Email válido (no temporal)
5. ✅ No has excedido el rate limit

---

## 📈 Métricas y Estadísticas

### Ver Métricas de Seguridad

```typescript
import { getSecurityMetrics } from '@/lib/security/security-logger'

const metrics = getSecurityMetrics(24) // Últimas 24 horas
console.log({
  totalAttempts: metrics.totalAttempts,
  blockedAttempts: metrics.blockedAttempts,
  spamDetections: metrics.spamDetections,
  topOffendingIPs: metrics.topOffendingIPs
})
```

---

## 🚀 Deployment a Producción

### Vercel

1. Configura las variables de entorno en el dashboard de Vercel:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - `RECAPTCHA_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL`

2. Deploy:
```bash
vercel --prod
```

### Recomendaciones para Producción:

1. ✅ Usa Redis para almacenar rate limits y IPs bloqueadas
2. ✅ Implementa logging a servicio externo (Sentry, LogRocket)
3. ✅ Configura alertas para múltiples violaciones
4. ✅ Monitorea métricas regularmente
5. ✅ Mantén una whitelist de IPs confiables

---

## 📚 Recursos Adicionales

- [Documentación reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)
- [OWASP - Prevención de Spam](https://owasp.org/www-community/controls/Blocking_Spam)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa esta documentación
2. Ejecuta el script de pruebas: `node scripts/test-anti-spam.js`
3. Verifica los logs en consola
4. Revisa el archivo `MEJORAS-ANTI-SPAM.md` para detalles técnicos

---

**Última actualización:** 27 de octubre de 2025  
**Versión:** 1.0.0
