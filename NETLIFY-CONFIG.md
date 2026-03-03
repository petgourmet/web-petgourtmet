# Configuración Netlify - Archivos y Optimización

## 📦 Estructura del directorio `.next`

Después del build de Next.js, se generan estos archivos y directorios en `.next/`:

### ✅ Archivos que Netlify **SÍ usa** (necesarios para producción)

1. **`.next/static/`** (~19MB)
   - Assets estáticos compilados (JS, CSS, imágenes optimizadas)
   - Chunks de JavaScript divididos por ruta
   - Archivos con hash para cache-busting
   - **Uso**: Netlify CDN sirve estos archivos directamente

2. **`.next/server/`** (~16MB)
   - Páginas renderizadas del lado del servidor
   - Páginas de API Routes
   - Manifests necesarios (pages-manifest.json, middleware-manifest.json)
   - **Uso**: Runtime de Next.js en Netlify Functions

3. **Manifests principales**
   - `app-build-manifest.json` (1.2KB)
   - `build-manifest.json` (388B)
   - `react-loadable-manifest.json` (2.8KB)
   - **Uso**: Router de Next.js para navegación y code-splitting

### ❌ Archivos que Netlify **NO usa** (innecesarios en producción)

1. **`.next/cache/`** (~46MB)
   - Cache de compilación local (webpack, SWC)
   - Solo para acelerar builds subsecuentes localmente
   - **Problema**: Ocupan espacio innecesario en el deploy
   - **Solución**: Excluir con `.netlify-ignore`

2. **`.next/trace`** (~736KB)
   - Archivo de debugging/profiling
   - Información de performance del build
   - **Problema**: No se usa en runtime
   - **Solución**: Excluir con `.netlify-ignore`

3. **Archivos `.hot-update.json` y `.hot-update.js`**
   - Solo para Hot Module Replacement en desarrollo
   - **Problema**: No funcionales en producción
   - **Solución**: Excluir con `.netlify-ignore`

## 🔧 Archivos de configuración creados

### 1. `netlify.toml` - Configuración principal

```toml
[build]
  command = "pnpm install --frozen-lockfile && pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Headers configurados:**
- ✅ MIME types correctos para JS/CSS (previene errores de tipo)
- ✅ Cache óptimo para assets estáticos (31536000s = 1 año)
- ✅ Cache moderado para imágenes públicas (86400s = 1 día)
- ✅ Headers de seguridad (X-Content-Type-Options, X-Frame-Options)

### 2. `.netlify-ignore` - Exclusión de archivos

Excluye automáticamente:
- `.next/cache/` (46MB ahorrados)
- `.next/trace` (736KB ahorrados)
- Archivos de test y temporales
- Hot-update files

**Total ahorrado por deploy**: ~47MB

## 🚀 Beneficios de la configuración

### Problema resuelto: MIME types incorrectos

**Antes:**
```
productos/[slug] → Servidor devuelve text/html para archivos .js
→ Browser rechaza ejecutar el JavaScript
→ Página en blanco o errores de hidratación
```

**Después:**
```
productos/[slug] → Headers fuerzan application/javascript
→ Browser ejecuta correctamente
→ Página funciona perfectamente
```

### Mejoras de performance

1. **Cache óptimo**: Assets estáticos con cache de 1 año
2. **Menor tamaño**: ~47MB menos por deploy
3. **CDN eficiente**: Headers correctos = mejor distribución
4. **Build más rápido**: Menos archivos para copiar

## 📋 Checklist pre-deploy

Antes de hacer push a Netlify:

- [x] netlify.toml configurado
- [x] Plugin @netlify/plugin-nextjs en package.json (NO necesario, el plugin se instala automáticamente)
- [x] .netlify-ignore creado
- [x] Headers de MIME configurados
- [x] Cache policies definidas
- [x] Rutas en minúsculas consistentes (`/productos`, `/producto/[slug]`)
- [ ] Variables de entorno configuradas en Netlify dashboard
- [ ] Supabase URL y keys en Netlify
- [ ] Stripe keys en Netlify

## 🔍 Verificación post-deploy

Después del deploy, verifica:

1. **Headers correctos**:
   ```bash
   curl -I https://tu-sitio.netlify.app/_next/static/chunks/main.js
   ```
   Debe mostrar: `Content-Type: application/javascript; charset=utf-8`

2. **Rutas funcionando**:
   - https://tu-sitio.netlify.app/productos
   - https://tu-sitio.netlify.app/producto/nombre-producto

3. **Assets cargando**:
   - Abrir DevTools → Network
   - Verificar que archivos JS/CSS cargan con status 200
   - No debe haber errores MIME type

## 🐛 Troubleshooting

### Error: "Refused to execute script... MIME type ('text/html')"

**Causa**: Netlify está sirviendo HTML en lugar de JS
**Solución**: 
1. Verificar que netlify.toml tenga los headers correctos
2. Hacer redeploy con `git push`
3. Limpiar cache de Netlify si persiste

### Error: "Page not found" en rutas dinámicas

**Causa**: Problema de mayúsculas/minúsculas o configuración de routing
**Solución**:
1. Verificar que carpetas sean lowercase (`/producto`, no `/Producto`)
2. Verificar que el plugin @netlify/plugin-nextjs esté activo
3. Revisar logs de build en Netlify dashboard

### Build timeout o out of memory

**Causa**: Build demasiado pesado
**Solución**:
```toml
[build.environment]
  NODE_OPTIONS = "--max-old-space-size=4096"
```

## 📚 Referencias

- [Netlify Next.js Plugin](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Next.js Output File Tracing](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Netlify Headers](https://docs.netlify.com/routing/headers/)
