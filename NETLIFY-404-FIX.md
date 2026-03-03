# 🚨 Solución para Error 404 + MIME type 'text/html' en Netlify

## El Problema

```
❌ _next/static/chunks/app/layout-70163a2b7930e5ca.js → 404
❌ MIME type 'text/html' en lugar de 'application/javascript'
❌ CSS con MIME type 'text/html' en lugar de 'text/css'
```

**Causa raíz**: Los archivos `_next/static/` NO existen en la ubicación esperada o el plugin de Netlify no está funcionando correctamente.

## Soluciones (en orden de prioridad)

### ✅ Solución 1: Verificar configuración de Netlify Dashboard

1. Ve a tu sitio en Netlify Dashboard
2. **Site settings → Build & deploy → Build settings**
3. Verifica:
   ```
   Base directory: [vacío o raíz]
   Build command: pnpm install --frozen-lockfile && pnpm build
   Publish directory: [DEJAR VACÍO] ← CRÍTICO
   ```

4. **Site settings → Environment → Environment variables**
   - Agrega todas las variables necesarias (NEXT_PUBLIC_*, etc.)

5. **Site settings → Build & deploy → Build plugins**
   - El plugin `@netlify/plugin-nextjs` debe estar ACTIVO
   - Si no aparece, instálalo desde el directorio de plugins de Netlify

### ✅ Solución 2: Limpiar cache de Netlify

En el Dashboard de Netlify:
1. **Deploys → Trigger deploy → Clear cache and deploy site**
2. Espera a que complete el build
3. Revisa los logs de build buscando:
   ```
   ✓ Next.js Plugin installed
   ✓ Build completed
   ✓ Copying files to publish directory
   ```

### ✅ Solución 3: Verificar que el build funcione localmente

```bash
# Simular el build de Netlify
export NETLIFY=true
pnpm install --frozen-lockfile
pnpm build

# Verificar que los archivos existan
ls -la .next/static/chunks/app/
ls -la .next/server/app/

# Si ves archivos SIN hash (layout.js), el problema está confirmado
# Los archivos deberían tener hash en producción
```

### ✅ Solución 4: Configuración alternativa de Next.js

Si las soluciones anteriores no funcionan, prueba esta configuración en `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // NO usar output: 'standalone' en Netlify con el plugin
  // El plugin maneja esto automáticamente
  
  // Asegurar que los assets se generen correctamente
  generateBuildId: async () => {
    return process.env.NETLIFY_BUILD_ID || `build-${Date.now()}`
  },
  
  // ... resto de tu configuración
}
```

### ✅ Solución 5: Usar archivo _headers en public/

Crea `public/_headers`:

```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/javascript

/_next/static/*.js
  Content-Type: application/javascript; charset=utf-8

/_next/static/*.css
  Content-Type: text/css; charset=utf-8
```

### ✅ Solución 6: Depuración avanzada

Actualiza el build command en Netlify Dashboard:

```bash
pnpm install --frozen-lockfile && pnpm build && bash netlify-debug.sh
```

Luego revisa los logs de build para ver:
- Si los archivos se generan correctamente
- Qué archivos existen en `.next/static/chunks/app/`
- Si tienen hash o no

## 🔍 Diagnóstico

### Opción A: Los archivos NO se están generando

**Síntoma**: En los logs de build de Netlify no ves archivos en `.next/static/chunks/app/`

**Solución**:
1. Verifica que el build command sea correcto
2. Revisa errores en el build log de Netlify
3. Asegúrate que todas las dependencias estén en `package.json`
4. Verifica que `pnpm-lock.yaml` esté committeado

### Opción B: Los archivos se generan pero Netlify no los encuentra

**Síntoma**: Build exitoso pero 404 en runtime

**Solución**:
1. El plugin `@netlify/plugin-nextjs` NO está activo
2. Ve a Dashboard → Plugins → Instalar `@netlify/plugin-nextjs`
3. Redeploy

### Opción C: Conflicto de configuración

**Síntoma**: Build exitoso, archivos existen, pero aún 404

**Solución**:
1. Elimina CUALQUIER archivo `netlify.toml` de versiones anteriores
2. Usa solo la configuración mínima
3. NO especifiques `publish` directory
4. Deja que el plugin maneje todo

## 📝 Configuración Mínima Funcional

**netlify.toml**:
```toml
[build]
  command = "pnpm install --frozen-lockfile && pnpm build"
  
[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "10"
  NODE_OPTIONS = "--max-old-space-size=4096"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**next.config.mjs**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración esencial para Netlify
  output: process.env.NETLIFY ? 'standalone' : undefined,
  
  // Tu configuración existente...
}

export default nextConfig
```

## 🎯 Checklist Final

Antes de hacer el próximo deploy:

- [ ] `netlify.toml` sin especificar `publish`
- [ ] Plugin `@netlify/plugin-nextjs` activo en Dashboard
- [ ] Variables de entorno configuradas en Netlify
- [ ] Cache de Netlify limpiado
- [ ] Build local funciona: `NETLIFY=true pnpm build`
- [ ] `.next/static/chunks/app/` tiene archivos después del build
- [ ] `pnpm-lock.yaml` está en el repositorio
- [ ] No hay archivos `_headers` o `_redirects` conflictivos

## 🆘 Último Recurso

Si NADA funciona, prueba desplegar en Vercel temporalmente para confirmar que tu código funciona:

```bash
npm i -g vercel
vercel --prod
```

Si funciona en Vercel pero no en Netlify, el problema es definitivamente de configuración de Netlify, no de tu código.

## 📞 Soporte

Si después de seguir todos estos pasos el problema persiste:
1. Descarga los logs completos del build de Netlify
2. Verifica en Network tab del browser qué archivos exactos faltan
3. Compara la estructura de `.next/` local vs producción
4. Contacta soporte de Netlify con los logs
