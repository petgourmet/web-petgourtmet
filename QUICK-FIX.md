# ⚡ Quick Fix para Error 404 + MIME type en Netlify

## El Problema

```
❌ _next/static/chunks/app/layout-*.js → 404
❌ MIME type 'text/html' instead of 'application/javascript'
```

## La Causa

**Publish directory configurado como `.next` en Netlify Dashboard**

## La Solución (2 minutos)

### 1️⃣ Netlify Dashboard → Site Settings → Build & deploy → Build settings

**Cambiar esto:**
```
Publish directory: .next  ❌
```

**Por esto:**
```
Publish directory: [VACÍO]  ✅
```

### 2️⃣ Trigger deploy

```
Deploys → Trigger deploy → Clear cache and deploy site
```

### 3️⃣ Verificar

Después del deploy, abre tu sitio y revisa la consola.
Ya no deberías ver errores 404 ni MIME type.

---

## Por qué funciona

El plugin `@netlify/plugin-nextjs` necesita controlar cómo se despliega Next.js.

Cuando especificas un publish directory manualmente, le dices a Netlify:
"Sirve estos archivos como HTML estático"

Pero Next.js necesita:
- Server-side rendering
- API routes
- Funciones serverless
- Build optimizado

El plugin maneja todo esto **automáticamente** si NO le especificas publish directory.

---

## Configuración correcta en netlify.toml

```toml
[build]
  # NO especificar 'publish'
  command = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Checklist

- [ ] Publish directory = VACÍO
- [ ] Plugin @netlify/plugin-nextjs activo
- [ ] Cache limpiado
- [ ] Nuevo deploy exitoso
- [ ] Sitio funciona sin errores 404

**Tiempo estimado: 2-3 minutos**
