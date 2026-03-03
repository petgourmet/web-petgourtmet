# 🎯 Configuración Paso a Paso para Netlify (CON CAPTURAS)

## ⚠️ PROBLEMA IDENTIFICADO EN TUS CAPTURAS

En tu configuración actual vi:
- ❌ **Publish directory: `.next`** ← ESTO CAUSA EL ERROR
- ❌ **Build command: `pnpm run build`** (cambiar a npm si no tienes pnpm configurado)

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Ir a Build Settings

1. En Netlify Dashboard, sidebar izquierdo → **"Project configuration"**
2. Click en **"Build & deploy"** 
3. Busca la sección **"Build settings"**
4. Click en botón **"Configure"** o **"Edit settings"**

### Paso 2: Configurar CORRECTAMENTE

**Debes configurar así:**

```
Base directory:          [vacío o /]
Build command:           npm run build
Publish directory:       [VACÍO - NO PONGAS NADA]  ← MUY IMPORTANTE
Functions directory:     netlify/functions
```

**CRÍTICO**: El campo "Publish directory" debe estar **completamente vacío** o tener solo un punto `.`

### Paso 3: Verificar Plugin de Next.js

1. En el mismo menú lateral → **"Build & deploy"**
2. Click en **"Build plugins"**
3. Busca **"@netlify/plugin-nextjs"**
4. Debe decir **"ENABLED"** o **"Active"**

Si NO aparece:
- Click en **"Add plugin"**
- Busca "Next.js"
- Click en **"Install"** en el plugin oficial de Netlify

### Paso 4: Limpiar Cache

**IMPORTANTE**: Después de cambiar la configuración:

1. Ve a **"Deploys"** (arriba)
2. Click en **"Trigger deploy"** dropdown
3. Selecciona **"Clear cache and deploy site"**

Esto asegura que Netlify no use build caches antiguas.

### Paso 5: Verificar Environment Variables

1. Sidebar → **"Environment variables"** (o "Environment")
2. Asegúrate de tener configuradas todas las variables necesarias:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=tu_key_aqui
STRIPE_SECRET_KEY=tu_secret_aqui
STRIPE_WEBHOOK_SECRET=tu_webhook_aqui
(todas las que necesites)
```

## 🔍 VERIFICAR QUE EL BUILD FUNCIONE

Después del deploy, revisa los **logs de build** en Netlify:

### ✅ Deberías ver esto en los logs:

```
1. Installing plugins
   - @netlify/plugin-nextjs@5.x.x
   
2. Running Next.js build
   ▲ Next.js 15.2.6
   ✓ Compiled successfully
   ✓ Generating static pages (146/146)
   
3. Packaging Next.js artifacts
   ✓ Moving static assets to serve
   ✓ Next.js cache saved
   
4. Deploy successful
```

### ❌ Si ves esto hay problema:

```
Warning: No publish directory found
Error: Build directory not found
```

Esto significa que el plugin NO está funcionando correctamente.

## 🎯 RESUMEN - CHECKLIST FINAL

Antes de hacer otro deploy, verifica:

- [ ] Publish directory: **VACÍO** (el más importante)
- [ ] Build command: `npm run build`
- [ ] Plugin `@netlify/plugin-nextjs` instalado y activo
- [ ] Variables de entorno configuradas
- [ ] Cache limpiado antes del nuevo deploy
- [ ] netlify.toml en el repo SIN especificar `publish`

## 🐛 SI AÚN FALLA

### Opción A: Verificar logs de build

Ve a **Deploys → (último deploy) → Deploy log**

Busca estas líneas específicas:
```bash
# Debe aparecer:
@netlify/plugin-nextjs: Success
Next.js Plugin
  ✓ Next.js build succeeded
```

Si NO aparecen, el plugin no está corriendo.

### Opción B: Reinstalar el plugin

1. Build plugins → Remove "@netlify/plugin-nextjs"
2. Trigger deploy (fallará pero limpiará config)
3. Build plugins → Add plugin nuevamente
4. Clear cache and deploy

### Opción C: Usar configuración mínima

Elimina TODO del `netlify.toml` excepto:

```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Configura todo lo demás desde el Dashboard.

## 📸 EVIDENCIA DE QUE FUNCIONA

Cuando esté correcto, verás en Network tab del browser:

```
✅ _next/static/chunks/app/layout-[hash].js → 200 OK
   Content-Type: application/javascript
   
✅ _next/static/css/[hash].css → 200 OK
   Content-Type: text/css
```

No más 404, no más MIME type 'text/html'.

## 🆘 CONTACTO DE SOPORTE

Si después de seguir TODO esto aún falla:
1. Exporta los logs completos de build
2. Toma captura del Network tab mostrando los 404
3. Toma captura de Build settings
4. Contacta soporte de Netlify con esas pruebas

---

**RECUERDA**: El error `MIME type 'text/html'` significa que Netlify está devolviendo una página 404 (HTML) donde debería haber un archivo JS/CSS. La causa es **SIEMPRE** que el publish directory está mal configurado cuando usas el plugin de Next.js.
