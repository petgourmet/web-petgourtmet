# 🛡️ Mejoras de Seguridad Anti-Spam Implementadas

## Resumen
Se han implementado múltiples capas de protección anti-spam para prevenir el envío de formularios no deseados a través de los formularios de contacto y newsletter.

## ✅ Mejoras Implementadas

### 1. **Verificación de reCAPTCHA Obligatoria**
- ✅ Validación de token de reCAPTCHA en **todos** los formularios
- ✅ Score mínimo requerido:
  - Formulario de contacto: **0.5** (más estricto)
  - Newsletter: **0.4** (moderado)
- ✅ Bloqueo automático si no se envía token o si falla la verificación

**Archivos modificados:**
- `app/api/contact/route.ts`
- `app/api/newsletter/route.ts`

### 2. **Sistema de Bloqueo Automático de IPs**
Nuevo sistema inteligente que bloquea IPs basándose en comportamiento sospechoso.

**Características:**
- ✅ Bloqueo inmediato por activación de honeypot (bots)
- ✅ Bloqueo por múltiples intentos de spam (2+ intentos)
- ✅ Bloqueo por bajo score de reCAPTCHA repetido (3+ veces)
- ✅ Bloqueo por violaciones de rate limit (5+ veces)
- ✅ Duraciones de bloqueo automáticas:
  - **Baja severidad:** 5 minutos
  - **Media severidad:** 30 minutos
  - **Alta severidad:** 24 horas

**Archivos creados:**
- `lib/security/ip-blocker.ts` (nuevo sistema)

**Archivos modificados:**
- `app/api/contact/route.ts`
- `app/api/newsletter/route.ts`

### 3. **Validación de Tiempo Mínimo de Formulario**
Los bots típicamente envían formularios en menos de 1 segundo. Ahora se requiere un tiempo mínimo.

**Configuración:**
- ✅ Formulario de contacto: mínimo **5 segundos**
- ✅ Newsletter: mínimo **3 segundos**
- ✅ Bloqueo de envíos inmediatos (< 1 segundo)
- ✅ Bloqueo de formularios expirados (> 30 minutos)

**Archivos creados:**
- `hooks/useFormTimer.ts` (nuevo hook)

**Archivos modificados:**
- `components/contact-section.tsx`
- `components/newsletter.tsx`

### 4. **Patrones de Detección de Spam Mejorados**
Se expandieron significativamente los patrones de detección de contenido spam.

**Nuevos patrones detectados:**
- ✅ Productos farmacéuticos (viagra, cialis, pills, etc.)
- ✅ Casino y apuestas (poker, lottery, betting, gambling)
- ✅ Marketing agresivo (click here, free money, earn cash)
- ✅ Fraudes comunes (nigerian prince, wire transfer, inheritance)
- ✅ Contenido adulto (dating, singles, webcam)
- ✅ Cripto y finanzas (bitcoin, forex, trading, NFT)
- ✅ SEO spam (backlink, rank higher, increase traffic)
- ✅ Servicios no solicitados (web design, outsourcing)
- ✅ Patrones en otros idiomas (ruso, chino)
- ✅ Múltiples URLs (> 2 enlaces)
- ✅ Caracteres repetidos excesivamente
- ✅ Texto en mayúsculas excesivo
- ✅ Emails/dominios sospechosos

**Archivos modificados:**
- `hooks/useAntiSpam.ts`

### 5. **Validación de Dominios de Email Sospechosos**
Se agregó lista de dominios de email temporal/desechable bloqueados.

**Dominios bloqueados:**
- tempmail, throwaway, guerrillamail
- mailinator, maildrop, 10minutemail
- yopmail, temp-mail, fakeinbox
- sharklasers, trashmail, getnada
- spamgourmet, y más...

**Archivos modificados:**
- `app/api/contact/route.ts`
- `app/api/newsletter/route.ts`

### 6. **Rate Limiting Reforzado**
- ✅ Formulario de contacto: **máximo 3 envíos** por ventana de tiempo
- ✅ Newsletter: **máximo 5 suscripciones** por ventana de tiempo
- ✅ Bloqueo automático por múltiples violaciones

### 7. **Validación de Contenido Mejorada**
- ✅ Longitud mínima de texto (3 caracteres)
- ✅ Longitud máxima de mensaje (5000 caracteres)
- ✅ Validación de nombre (2-100 caracteres)
- ✅ Detección de patrones de texto basura (test, asdf, qwerty)
- ✅ Detección de patrones repetitivos

## 🔒 Capas de Seguridad (en orden de ejecución)

### Para Formulario de Contacto:
1. **Verificación de IP bloqueada** → Bloqueo inmediato si está en lista negra
2. **Honeypot** → Campo oculto para detectar bots
3. **Token de reCAPTCHA** → Validación obligatoria con score mínimo 0.5
4. **Rate Limiting** → Máximo 3 envíos permitidos
5. **Validación de email** → Formato + dominios sospechosos
6. **Validación de contenido** → Detección de spam en mensaje
7. **Validación de nombre** → Longitud y patrones válidos
8. **Tiempo mínimo** → Al menos 5 segundos desde carga del formulario

### Para Newsletter:
1. **Verificación de IP bloqueada**
2. **Honeypot**
3. **Token de reCAPTCHA** (score mínimo 0.4)
4. **Rate Limiting** (máximo 5 intentos)
5. **Validación de email** + dominios sospechosos
6. **Tiempo mínimo** (3 segundos)

## 📊 Sistema de Logging y Monitoreo

Todos los intentos sospechosos se registran con:
- ✅ IP del cliente
- ✅ User Agent
- ✅ Endpoint accedido
- ✅ Tipo de violación
- ✅ Severidad del incidente
- ✅ Score de reCAPTCHA (si aplica)
- ✅ Detalles específicos del incidente

**Sistema de alertas:**
- 🚨 Violaciones de alta severidad se logean como advertencias
- 📝 Todas las violaciones se almacenan para análisis

## 🎯 Indicadores de Éxito

### Antes:
- ❌ Spam constante en formularios
- ❌ Bots podían enviar sin restricciones
- ❌ No había bloqueo de IPs abusivas

### Ahora:
- ✅ **8 capas de validación** en formulario de contacto
- ✅ **6 capas de validación** en newsletter
- ✅ Bloqueo automático de IPs maliciosas
- ✅ Validación de tiempo para prevenir bots rápidos
- ✅ Detección avanzada de contenido spam
- ✅ Bloqueo de emails temporales/desechables
- ✅ Sistema de monitoreo y logging completo

## 🔧 Configuración Recomendada

### Variables de Entorno (si aún no están configuradas):
```env
# reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_site_key
RECAPTCHA_SECRET_KEY=tu_secret_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=10   # 10 requests máximo

# URL de la aplicación
NEXT_PUBLIC_APP_URL=https://petgourmet.mx
```

## 📈 Próximos Pasos (Opcional - Mejoras Futuras)

1. **Migrar almacenamiento a Redis** para rate limiting y bloqueo de IPs en producción
2. **Dashboard de administración** para ver IPs bloqueadas y métricas
3. **Notificaciones por email** cuando se detecten ataques masivos
4. **Integración con servicio externo** de análisis de spam (Akismet, etc.)
5. **Whitelist de IPs** para casos especiales

## 🚀 Testing

Para probar las protecciones:

1. **Honeypot:** Completar el campo oculto "website" → Debería devolver éxito falso
2. **Tiempo mínimo:** Enviar formulario en < 3 segundos → Debería rechazar
3. **Contenido spam:** Incluir palabras como "viagra", "casino" → Debería rechazar
4. **Email temporal:** Usar email @tempmail.com → Debería rechazar
5. **Rate limiting:** Enviar > 3 mensajes rápidamente → Debería bloquear

## ⚠️ Notas Importantes

- El bloqueo de IPs es **temporal** (no permanente)
- Las IPs bloqueadas se limpian automáticamente cada 10 minutos
- En desarrollo, todos los eventos de seguridad se logean en consola
- En producción, se recomienda integrar con servicio de logging externo

## 📝 Archivos Creados/Modificados

### Archivos Nuevos:
- `lib/security/ip-blocker.ts` - Sistema de bloqueo de IPs
- `hooks/useFormTimer.ts` - Hook de validación de tiempo
- `MEJORAS-ANTI-SPAM.md` - Este documento

### Archivos Modificados:
- `app/api/contact/route.ts` - Todas las validaciones agregadas
- `app/api/newsletter/route.ts` - Todas las validaciones agregadas
- `hooks/useAntiSpam.ts` - Patrones de spam expandidos
- `components/contact-section.tsx` - Integración de validación de tiempo
- `components/newsletter.tsx` - Integración de validación de tiempo

---

**Fecha de implementación:** 27 de octubre de 2025
**Estado:** ✅ Completado y funcionando
**Errores de compilación:** ✅ 0 errores
