# 🔧 Configuración de Variables de Entorno

## ⚠️ Estado Actual
El script de testing identificó que **faltan variables de entorno críticas** necesarias para el funcionamiento de la aplicación.

## 📋 Variables Requeridas

### 🗄️ Supabase (Base de Datos)
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_clave_servicio_aqui
```

**Cómo obtenerlas:**
1. Ve a [supabase.com](https://supabase.com)
2. Accede a tu proyecto
3. Ve a Settings > API
4. Copia la URL del proyecto y las claves

### 💳 MercadoPago (Pagos)
```env
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_clave_publica_aqui
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui
```

**Cómo obtenerlas:**
1. Ve a [developers.mercadopago.com](https://developers.mercadopago.com)
2. Accede a tu cuenta
3. Ve a "Tus integraciones" > "Credenciales"
4. Usa las credenciales de **Sandbox** para testing

### 📧 Resend (Emails)
```env
RESEND_API_KEY=tu_api_key_de_resend
FROM_EMAIL=noreply@tudominio.com
```

**Cómo obtenerlas:**
1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta o inicia sesión
3. Ve a API Keys y crea una nueva
4. Configura tu dominio de envío

## 🚀 Pasos de Configuración

### 1. Configurar Supabase en TRAE IDE
```bash
# El sistema reporta: "Failed to read project_id from config.toml"
# Necesitas configurar la integración de Supabase en TRAE IDE
```

### 2. Copiar Variables
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita el archivo .env con tus credenciales reales
```

### 3. Verificar Configuración
```bash
# Ejecuta el script de testing para verificar
node scripts/test-complete-system.js
```

## 🔍 Problemas Identificados

### ❌ Errores Actuales
- **Variables de entorno faltantes**: Todas las credenciales
- **Integración Supabase**: No configurada en TRAE IDE
- **Endpoints API**: Devuelven 404 (probablemente por falta de configuración)
- **Conectividad DB**: Estado undefined

### ✅ Funcionando Correctamente
- Servidor de desarrollo (puerto 3000)
- Health check endpoint
- Páginas principales (home, productos, perfil)
- Admin órdenes

## 🎯 Próximos Pasos

1. **URGENTE**: Configurar integración Supabase en TRAE IDE
2. **CRÍTICO**: Completar variables de entorno en `.env`
3. **IMPORTANTE**: Verificar endpoints de API
4. **TESTING**: Re-ejecutar script de validación

## 🛠️ Comandos Útiles

```bash
# Verificar variables de entorno
echo $NEXT_PUBLIC_SUPABASE_URL

# Testing completo
node scripts/test-complete-system.js

# Iniciar servidor
npm run dev

# Verificar salud del sistema
curl http://localhost:3000/api/health
```

## 📞 Soporte

Si necesitas ayuda:
1. Verifica que todas las variables estén configuradas
2. Confirma que los servicios externos estén activos
3. Revisa los logs del servidor para errores específicos
4. Ejecuta el script de testing para diagnóstico completo