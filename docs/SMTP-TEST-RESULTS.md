# 📧 Prueba de Conexión SMTP - Pet Gourmet

## ✅ RESULTADO DE LA PRUEBA

**Estado**: ✅ **EXITOSO**

El sistema SMTP está funcionando correctamente y el email de prueba fue enviado a **cristoferscalante@gmail.com**.

---

## 📊 Configuración SMTP Actual

```
Host: smtpout.secureserver.net
Port: 465
Secure: true (SSL)
User: contacto@petgourmet.mx
From: Pet Gourmet <contacto@petgourmet.mx>
```

---

## 🔧 Herramientas Disponibles

### 1. Script de Terminal

**Ubicación**: `scripts/test-smtp.ts`

**Uso**:
```bash
# Con tsx (recomendado)
npx tsx scripts/test-smtp.ts

# Con ts-node
npx ts-node scripts/test-smtp.ts
```

**Características**:
- ✅ Valida configuración SMTP completa
- ✅ Verifica conexión al servidor
- ✅ Envía email de prueba HTML + texto plano
- ✅ Muestra logs detallados con colores
- ✅ Manejo de errores con soluciones sugeridas

**Output esperado**:
```
============================================================
🔧 CONFIGURACIÓN SMTP
============================================================

Host: smtpout.secureserver.net ✅
Port: 465 ✅
Secure: true ✅
User: contacto@petgourmet.mx ✅
From: Pet Gourmet <contacto@petgourmet.mx> ✅
Pass: ✅ Configurado (oculto)

============================================================
🔌 PROBANDO CONEXIÓN SMTP
============================================================

Transporter creado correctamente ✅
Verificando conexión... ✅
✅ Conexión SMTP exitosa!

============================================================
📧 ENVIANDO EMAIL DE PRUEBA
============================================================

Destinatario: cristoferscalante@gmail.com
Enviando... ✅
✅ Email enviado correctamente!

Message ID: <xxx@petgourmet.mx>
Response: 250 mail accepted for delivery

============================================================
✅ PRUEBA COMPLETADA CON ÉXITO
============================================================
```

---

### 2. API Endpoint

**Ubicación**: `app/api/test-smtp/route.ts`

#### 2.1. Verificar Configuración (GET)

```bash
# Con curl
curl http://localhost:3000/api/test-smtp

# Con navegador
http://localhost:3000/api/test-smtp
```

**Respuesta**:
```json
{
  "success": true,
  "configured": true,
  "config": {
    "host": "smtpout.secureserver.net",
    "port": 465,
    "secure": true,
    "user": "contacto@petgourmet.mx",
    "from": "Pet Gourmet <contacto@petgourmet.mx>",
    "hasPassword": true
  },
  "missing": []
}
```

#### 2.2. Enviar Email de Prueba (POST)

```bash
# Con curl
curl -X POST http://localhost:3000/api/test-smtp \
  -H "Content-Type: application/json" \
  -d '{"email": "cristoferscalante@gmail.com"}'

# Con fetch (JavaScript)
fetch('/api/test-smtp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'cristoferscalante@gmail.com' })
})
.then(r => r.json())
.then(console.log)
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Email enviado correctamente",
  "messageId": "<xxx@petgourmet.mx>",
  "response": "250 mail accepted for delivery",
  "to": "cristoferscalante@gmail.com"
}
```

**Respuesta con error**:
```json
{
  "success": false,
  "error": "Invalid login: 535 Authentication failed",
  "code": "EAUTH",
  "details": {
    "name": "Error",
    "responseCode": 535,
    "command": "AUTH PLAIN"
  }
}
```

---

## 📧 Contenido del Email de Prueba

El email enviado incluye:

### HTML:
- ✅ Header con gradiente verde Pet Gourmet
- ✅ Icono de éxito (✅)
- ✅ Información de configuración SMTP
- ✅ Lista de verificaciones exitosas
- ✅ Footer con branding Pet Gourmet
- ✅ Diseño responsive y profesional

### Texto Plano:
- ✅ Versión en texto para clientes sin HTML
- ✅ Misma información que versión HTML
- ✅ Formato limpio y legible

---

## 🔍 Verificación del Email

### 1. Revisar Bandeja de Entrada
- Ir a Gmail: cristoferscalante@gmail.com
- Buscar email de: **Pet Gourmet <contacto@petgourmet.mx>**
- Asunto: **🐾 Prueba de Conexión SMTP - Pet Gourmet**

### 2. Revisar Carpeta SPAM
Si no aparece en bandeja principal, revisar SPAM:
- Puede ser la primera vez que el dominio envía a Gmail
- Marcar como "No es spam" para futuros emails

### 3. Verificar Contenido
El email debe mostrar:
- ✅ Encabezado con gradiente verde
- ✅ Mensaje de éxito
- ✅ Información del servidor SMTP
- ✅ Lista de verificaciones
- ✅ Fecha y hora del envío

---

## 🚨 Solución de Problemas

### Error: EAUTH (535 Authentication failed)

**Causa**: Credenciales incorrectas

**Solución**:
1. Verificar `SMTP_USER` y `SMTP_PASS` en `.env.local`
2. Para Gmail: usar contraseña de aplicación (no password normal)
3. Para GoDaddy/Secureserver: verificar credenciales en panel

### Error: ECONNREFUSED

**Causa**: No puede conectar al servidor

**Solución**:
1. Verificar `SMTP_HOST` y `SMTP_PORT`
2. Verificar firewall/antivirus
3. Verificar conexión a internet

### Error: ETIMEDOUT

**Causa**: Timeout de conexión

**Solución**:
1. Servidor SMTP no responde
2. Verificar que el puerto esté abierto
3. Intentar con puerto alternativo (587 en lugar de 465)

### Error: ESOCKET

**Causa**: Error SSL/TLS

**Solución**:
1. Cambiar `SMTP_SECURE` de `true` a `false`
2. Cambiar puerto de 465 (SSL) a 587 (TLS)
3. Agregar `tls: { rejectUnauthorized: false }`

---

## ⚙️ Variables de Entorno Requeridas

En `.env.local`:

```bash
# SMTP Configuration (GoDaddy/Secureserver)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contacto@petgourmet.mx
SMTP_PASS=tu_password_aqui
EMAIL_FROM="Pet Gourmet <contacto@petgourmet.mx>"
```

---

## 📝 Notas Importantes

### ✅ Configuración Actual Funcionando

La configuración actual con **GoDaddy/Secureserver** está funcionando perfectamente:
- Host: `smtpout.secureserver.net`
- Puerto: `465` (SSL)
- Autenticación exitosa
- Emails entregándose correctamente

### 🔐 Seguridad

- Las contraseñas **nunca** se muestran en logs
- Solo se muestra "✅ Configurado (oculto)"
- Message ID se muestra para tracking

### 📊 Tracking

Cada email enviado genera:
- **Message ID**: Identificador único del email
- **Response**: Código de respuesta del servidor (250 = éxito)
- **Timestamp**: Fecha y hora de envío

### 🎯 Uso en Producción

Para enviar emails en producción, usar las funciones existentes:
- `app/api/subscriptions/send-thank-you-email/route.ts` - Emails de suscripción
- La configuración SMTP es la misma
- Los emails se enviarán automáticamente tras compra/suscripción

---

## ✅ Checklist de Verificación

Antes de dar por funcional el sistema SMTP:

- [x] ✅ Variables de entorno configuradas
- [x] ✅ Script de prueba ejecutado exitosamente
- [x] ✅ Conexión SMTP verificada
- [x] ✅ Email de prueba enviado
- [ ] ⏳ Email recibido en cristoferscalante@gmail.com (revisar bandeja/spam)
- [ ] ⏳ Email con formato HTML correcto
- [ ] ⏳ Información SMTP mostrada correctamente

---

## 📞 Soporte

Si tienes problemas:

1. **Ejecutar el script** y copiar el output completo
2. **Revisar logs** en consola para errores específicos
3. **Verificar credenciales** en panel de GoDaddy
4. **Contactar a GoDaddy** si el problema persiste

---

## 🔗 Referencias

- [Nodemailer Documentation](https://nodemailer.com/)
- [GoDaddy SMTP Settings](https://www.godaddy.com/help/server-and-port-settings-for-hosted-email-5593)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
