# 🚨 LIMPIEZA PRE-PRODUCCIÓN - PET GOURMET

## ⚠️ ARCHIVOS Y CARPETAS A ELIMINAR ANTES DE SUBIR A PRODUCCIÓN

### 🔴 **CRÍTICO - ELIMINAR OBLIGATORIAMENTE**

#### **1. Páginas de Test y Debug**
```bash
# Eliminar estas carpetas completas:
app/test-mercadopago/
app/test-subscriptions/
app/test-subscriptions-no-plan/
app/test-dynamic-subscriptions/
app/test-google-analytics/
app/test-facebook-pixel/
app/test-tracking/
app/admin/debug/
app/admin/debug-storage/
app/admin/storage-test/
app/admin/payment-test/
app/analyze-records/
app/debug-mercadopago/
app/simulacion-pago/
app/processing-payment/
```

#### **2. APIs de Debug y Test**
```bash
# Eliminar estas APIs:
app/api/test-mercadopago-config/
app/api/debug/
app/api/admin/payment-system-test/
app/api/cloudinary-verify/
app/api/mercadopago/test-preference/
app/api/mercadopago/test-preference-full/
```

#### **3. Componentes de Debug**
```bash
# Eliminar estos componentes:
components/storage-debug.tsx
components/admin/storage-diagnostic.tsx
components/admin/cloudinary-verifier.tsx
components/admin/cloudinary-diagnostic.tsx
components/admin/manual-sql-setup.tsx
components/admin/alternative-file-upload.tsx
components/admin/fallback-file-upload.tsx
```

#### **4. Archivos de Configuración de Desarrollo**
```bash
# Eliminar:
lib/supabase/setup-product-tables.ts
lib/supabase/create-blog-tables.ts
lib/supabase/storage-initializer.ts
```

### 🟡 **IMPORTANTE - REVISAR Y LIMPIAR**

#### **5. Documentación Técnica (Opcional)**
```bash
# Considerar eliminar (no crítico pero innecesario en producción):
ANALIZADOR_REGISTROS.md
INDICE_DOCUMENTACION_BD.md
MAPA_BASE_DATOS_ACTUAL.md
DIAGRAMA_RELACIONES_BD.md
SCRIPTS_MANTENIMIENTO_BD.md
SUSCRIPCIONES_DINAMICAS.md
SOLUCION_ERROR_500.md
```

#### **6. Archivos de Configuración de Desarrollo**
```bash
# Revisar y limpiar:
.vscode/tasks.json  # Configuración específica del IDE
tailwind.config.js-extension  # Archivo duplicado
```

### 🟢 **MANTENER - NECESARIOS PARA PRODUCCIÓN**

#### **Archivos de Configuración Esenciales**
- `next.config.mjs` ✅
- `package.json` ✅
- `tailwind.config.ts` ✅
- `tsconfig.json` ✅
- `postcss.config.mjs` ✅
- `components.json` ✅
- `.gitignore` ✅

#### **Servicios y Librerías**
- `lib/supabase/client.ts` ✅
- `lib/supabase/server.ts` ✅
- `lib/mercadopago-service.ts` ✅
- `lib/email-service.ts` ✅
- `lib/cloudinary-config.ts` ✅

## 🛡️ **VERIFICACIONES DE SEGURIDAD**

### **1. Variables de Entorno**
```bash
# Asegurar que estas NO estén hardcodeadas en el código:
❌ MERCADOPAGO_ACCESS_TOKEN
❌ SUPABASE_SERVICE_ROLE_KEY
❌ CLOUDINARY_API_SECRET
❌ SMTP_PASS
❌ EMAIL_FROM
```

### **2. Configuraciones de Producción**
```env
# Verificar en .env.production:
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
NODE_ENV=production
```

### **3. URLs y Dominios**
```bash
# Cambiar todas las referencias de localhost a dominio real:
❌ http://localhost:3001
❌ http://localhost:3000
✅ https://petgourmet.mx
```

## 📋 **SCRIPT DE LIMPIEZA AUTOMÁTICA**

```bash
#!/bin/bash
# Script para limpiar archivos de desarrollo

echo "🧹 Iniciando limpieza pre-producción..."

# Eliminar páginas de test
rm -rf app/test-*
rm -rf app/admin/debug*
rm -rf app/admin/storage-test
rm -rf app/admin/payment-test
rm -rf app/analyze-records
rm -rf app/debug-mercadopago
rm -rf app/simulacion-pago
rm -rf app/processing-payment

# Eliminar APIs de debug
rm -rf app/api/test-*
rm -rf app/api/debug
rm -rf app/api/admin/payment-system-test
rm -rf app/api/cloudinary-verify

# Eliminar componentes de debug
rm -f components/storage-debug.tsx
rm -f components/admin/storage-diagnostic.tsx
rm -f components/admin/cloudinary-verifier.tsx
rm -f components/admin/cloudinary-diagnostic.tsx
rm -f components/admin/manual-sql-setup.tsx
rm -f components/admin/alternative-file-upload.tsx
rm -f components/admin/fallback-file-upload.tsx

# Eliminar archivos de setup
rm -f lib/supabase/setup-product-tables.ts
rm -f lib/supabase/create-blog-tables.ts
rm -f lib/supabase/storage-initializer.ts

# Eliminar documentación técnica (opcional)
rm -f ANALIZADOR_REGISTROS.md
rm -f INDICE_DOCUMENTACION_BD.md
rm -f MAPA_BASE_DATOS_ACTUAL.md
rm -f DIAGRAMA_RELACIONES_BD.md
rm -f SCRIPTS_MANTENIMIENTO_BD.md
rm -f SUSCRIPCIONES_DINAMICAS.md
rm -f SOLUCION_ERROR_500.md

# Eliminar configuraciones de desarrollo
rm -rf .vscode
rm -f tailwind.config.js-extension

echo "✅ Limpieza completada!"
echo "⚠️  Recuerda verificar las variables de entorno de producción"
```

## 🔍 **VERIFICACIÓN POST-LIMPIEZA**

### **1. Compilación**
```bash
npm run build
# Debe compilar sin errores
```

### **2. Funcionalidades Críticas**
- ✅ Autenticación de usuarios
- ✅ Creación de suscripciones
- ✅ Procesamiento de pagos
- ✅ Envío de emails
- ✅ Subida de imágenes
- ✅ Panel de administración

### **3. URLs de Producción**
```bash
# Verificar que todas las URLs apunten a producción:
grep -r "localhost" . --exclude-dir=node_modules
grep -r "test-" . --exclude-dir=node_modules
grep -r "debug" . --exclude-dir=node_modules
```

## 🚀 **CHECKLIST FINAL**

- [ ] Eliminar todas las páginas de test
- [ ] Eliminar todas las APIs de debug
- [ ] Eliminar componentes de desarrollo
- [ ] Verificar variables de entorno
- [ ] Cambiar modo de test a producción
- [ ] Actualizar URLs a dominio real
- [ ] Compilar sin errores
- [ ] Probar funcionalidades críticas
- [ ] Verificar que no hay referencias a localhost
- [ ] Confirmar que no hay credenciales hardcodeadas

---

## ⚡ **COMANDO RÁPIDO**

```bash
# Ejecutar este comando para limpieza rápida:
find . -name "*test*" -type d -not -path "./node_modules/*" | head -20
find . -name "*debug*" -type d -not -path "./node_modules/*" | head -20
```

**🎯 OBJETIVO**: Eliminar ~50 archivos/carpetas de desarrollo para reducir superficie de ataque y mejorar seguridad en producción.

**⚠️ IMPORTANTE**: Hacer backup antes de ejecutar la limpieza.

---
*Documento generado automáticamente - Enero 2025*
*Estado: ✅ LISTO PARA IMPLEMENTAR*