# CLAUDE.md – Pet Gourmet Web

## Descripción del proyecto

E-commerce de alimento premium para mascotas (perros). Tienda online con catálogo de productos, planes de alimentación personalizados, suscripciones recurrentes, blog, contacto y panel de administración.

**Stack principal:**
- **Framework:** Next.js 15 (App Router) + React 19
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 3 + shadcn/ui (Radix UI primitives)
- **Base de datos / Auth:** Supabase (PostgreSQL + Auth + Storage)
- **Pagos:** Stripe (one-time + suscripciones recurrentes)
- **Imágenes:** Cloudinary
- **Email:** Nodemailer (SMTP)
- **Animaciones:** Framer Motion
- **Formularios:** React Hook Form + Zod
- **Testing:** Jest + Testing Library
- **Package manager:** pnpm
- **Deploy:** Netlify (producción)

---

## Comandos esenciales

```bash
pnpm dev            # Servidor de desarrollo (http://localhost:3000)
pnpm build          # Build de producción
pnpm start          # Servidor en modo producción
pnpm lint           # ESLint
pnpm test           # Jest (suite completa)
pnpm test:watch     # Jest en modo watch
pnpm test:coverage  # Cobertura
pnpm stripe:test    # Test de integración Stripe
pnpm stripe:setup   # Crear productos en Stripe
```

---

## Estructura de carpetas clave

```
app/                    # Next.js App Router
  admin/                # Panel de administración (protegido)
  api/                  # Route Handlers (REST endpoints)
    stripe/             # Webhooks y checkout de Stripe
    subscriptions/      # Gestión de suscripciones
    contact/            # Formulario de contacto
    newsletter/         # Newsletter
    orders/             # Pedidos
    admin/              # API de administración
  auth/                 # Flujos de autenticación (Supabase)
  checkout/             # Flujo de pago
  productos/            # Catálogo de productos
  producto/[id]/        # Detalle de producto
  crear-plan/           # Configurador de plan de alimentación
  suscripcion/          # Gestión de suscripción del usuario
  perfil/               # Perfil del usuario
  blog/                 # Blog

components/             # Componentes React reutilizables
  cart-context.tsx      # Contexto del carrito de compras
  cart-modal.tsx        # Modal del carrito
  checkout-modal.tsx    # Modal de checkout
  product-card.tsx      # Tarjeta de producto
  navbar.tsx            # Navegación principal
  footer.tsx            # Pie de página

lib/                    # Servicios y utilidades del servidor
  supabase/             # Clientes Supabase (client, server, admin, service)
  stripe/               # Servicios de Stripe (checkout, config, create-order)
  email-service.ts      # Envío de emails
  rate-limit.ts         # Rate limiting
  security/             # Logger de seguridad y rate limiter
  subscription-manager.ts
  payment-sync-service.ts
  cache-service.ts

contexts/               # Contextos React (RecaptchaProvider, plan-form, tiendas)
hooks/                  # Custom hooks (use-auth, use-subscription-sync, anti-spam, etc.)
supabase/migrations/    # Migraciones de base de datos SQL
types/                  # Tipos TypeScript globales
utils/                  # Utilidades genéricas
scripts/                # Scripts de setup y testing de Stripe
```

---

## Arquitectura de autenticación

- Supabase Auth con SSR (`@supabase/ssr`)
- Tres clientes Supabase: `client.ts` (browser), `server.ts` (Server Components / Route Handlers), `admin-client.ts` (service role – solo en servidor)
- El **middleware** (`middleware.ts`) refresca la sesión en cada request y protege las rutas del panel de administración
- Rutas protegidas: `/admin/*`, `/perfil/*`, `/suscripcion/*`
- Los webhooks de Stripe (`/api/stripe/webhook`) están **excluidos** de toda lógica del middleware

---

## Pagos (Stripe)

- One-time purchases y suscripciones recurrentes
- Webhook endpoint: `/api/stripe/webhook` – verifica firma Stripe
- Servicio de idempotencia para evitar procesamiento duplicado de eventos (`lib/enhanced-idempotency-service.server.ts`)
- Sincronización de pagos: `lib/payment-sync-service.ts`
- `lib/subscription-manager.ts` gestiona el lifecycle de suscripciones

---

## Anti-spam / Seguridad

- Rate limiting por IP en rutas de formularios (`lib/rate-limit.ts`, `lib/security/rate-limiter.ts`)
- Hooks de detección de actividad sospechosa: `hooks/useSuspiciousActivityDetector.ts`, `hooks/useAntiSpam.ts`
- reCAPTCHA integrado (`lib/recaptcha.ts`, `contexts/RecaptchaProvider.tsx`)
- Logger de seguridad: `lib/security/security-logger.ts`

---

## Imágenes

- Almacenamiento en Cloudinary (upload via `/api/upload-cloudinary`)
- Configuración: `lib/cloudinary-config.ts`, `lib/cloudinary-service.ts`
- `next/image` con `remotePatterns` configurados para `res.cloudinary.com` y `*.supabase.co`

---

## Testing

- **Framework:** Jest + jsdom + Testing Library
- **Config:** `jest.setup.js`
- Variables de entorno para tests: `.env.test`
- Para tests con Stripe: `pnpm test:sandbox`

---

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_GTM_ID
NEXT_PUBLIC_FACEBOOK_PIXEL_ID
RECAPTCHA_SECRET_KEY
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

---

## Deploy

- **Plataforma:** Netlify
- Config: `netlify.toml` – build command `npm run build`, Node 20, `--max-old-space-size=4096`
- El output es `standalone` cuando `NETLIFY=true`
- Cache de assets estáticos configurado en `netlify.toml`

---

## Convenciones de código

- Alias de import: `@/` apunta a la raíz del proyecto (configurado en `tsconfig.json`)
- Componentes UI de shadcn en `components/ui/`
- Server Components por defecto; `"use client"` solo cuando se necesita interactividad
- Se prefiere `pnpm` sobre `npm` o `yarn`
- Los Route Handlers de Next.js usan el cliente Supabase de servidor, **nunca** el cliente de browser
- Los archivos `.bak` y `.backup` son respaldos temporales, no editar
