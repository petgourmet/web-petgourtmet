# Esquema de Base de Datos - PetGourmet

---

## 🗂️ Inventario Completo de Tablas

### 🆕 **NUEVAS TABLAS - SISTEMA DE IDEMPOTENCIA**

### 1. **idempotency_locks** 🔒
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: Variable

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del lock |
| key | text | NO | NULL | Clave única para identificar la operación idempotente |
| lock_id | text | NO | NULL | Identificador único del lock para liberación segura |
| acquired_at | timestamp with time zone | YES | now() | Fecha de adquisición del lock |
| expires_at | timestamp with time zone | NO | NULL | Fecha de expiración del lock |
| released_at | timestamp with time zone | YES | NULL | Fecha de liberación del lock |
| operation_id | text | YES | NULL | ID de la operación asociada para trazabilidad |
| metadata | jsonb | YES | '{}'::jsonb | Información adicional sobre el lock |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_idempotency_locks_key_active ON (key) WHERE released_at IS NULL
- INDEX idx_idempotency_locks_expires_at ON (expires_at)
- INDEX idx_idempotency_locks_operation_id ON (operation_id)

**RLS**: ✅ Habilitado
**Permisos**: service_role (ALL), authenticated (SELECT, INSERT, UPDATE)

**Uso en código**: **CRÍTICA PARA IDEMPOTENCIA** - Referencias en:
- `lib/database-lock-manager.ts`
- `lib/unified-idempotency.service.ts`
- `__tests__/unified-idempotency.test.ts`

---

### 2. **operation_logs** 📝
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: Variable

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del log |
| operation_id | text | NO | NULL | Identificador único de la operación para agrupar logs |
| operation_type | text | NO | NULL | Tipo de operación (idempotency_start, validation, etc.) |
| level | text | NO | NULL | Nivel de log (debug, info, warn, error) |
| message | text | NO | NULL | Mensaje del log |
| details | jsonb | YES | '{}'::jsonb | Información detallada de la operación en formato JSON |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| subscription_id | uuid | YES | NULL | ID de suscripción relacionada |
| user_id | uuid | YES | NULL | ID de usuario relacionado |
| external_reference | text | YES | NULL | Referencia externa de MercadoPago para correlación |
| execution_time_ms | integer | YES | NULL | Tiempo de ejecución en milisegundos |
| memory_usage_mb | numeric | YES | NULL | Uso de memoria en MB |
| stack_trace | text | YES | NULL | Stack trace en caso de errores |
| request_id | text | YES | NULL | ID de la petición HTTP |
| session_id | text | YES | NULL | ID de la sesión |

**Índices**:
- PRIMARY KEY (id)
- INDEX idx_operation_logs_operation_id ON (operation_id)
- INDEX idx_operation_logs_level ON (level)
- INDEX idx_operation_logs_created_at ON (created_at)
- INDEX idx_operation_logs_subscription_id ON (subscription_id)
- INDEX idx_operation_logs_user_id ON (user_id)
- INDEX idx_operation_logs_external_reference ON (external_reference)

**Constraints**:
- CHECK (level = ANY (ARRAY['debug'::text, 'info'::text, 'warn'::text, 'error'::text]))
- CHECK (execution_time_ms >= 0)
- CHECK (memory_usage_mb >= 0::numeric)

**RLS**: ✅ Habilitado
**Permisos**: service_role (ALL), authenticated (SELECT, INSERT)

**Uso en código**: **CRÍTICA PARA LOGGING** - Referencias en:
- `lib/detailed-logger.ts`
- `lib/unified-idempotency.service.ts`
- `__tests__/unified-idempotency.test.ts`

---

## 📊 **TABLAS PRINCIPALES DEL SISTEMA**

### 1. **products** 📦
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 41

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del producto |
| name | text | NO | NULL | Nombre del producto |
| slug | text | NO | NULL | URL amigable |
| description | text | YES | NULL | Descripción del producto |
| price | numeric | NO | NULL | Precio del producto |
| image | text | YES | NULL | URL de la imagen principal |
| category_id | uuid | YES | NULL | ID de la categoría (FK a categories) |
| status | text | YES | 'active'::text | Estado del producto |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |
| weekly_discount | numeric | YES | NULL | Descuento semanal |
| subscription_price | numeric | YES | NULL | Precio de suscripción |
| subscription_discount | numeric | YES | NULL | Descuento de suscripción |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (slug)

**Uso en código**: **TABLA MÁS UTILIZADA** - 50+ referencias en archivos como:
- `app/productos/page.tsx`, `app/producto/[slug]/page.tsx`
- `components/product-category-loader.tsx`
- `app/admin/(dashboard)/products/`
- `lib/dynamic-discount-service.ts`
- `app/sitemap.ts`

---

### 2. **orders** 🛒
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 32

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la orden |
| user_id | uuid | YES | NULL | ID del usuario (FK a profiles) |
| status | text | YES | 'pending'::text | Estado de la orden |
| total | numeric | NO | NULL | Total de la orden |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |
| payment_method | text | YES | NULL | Método de pago |
| payment_status | text | YES | 'pending'::text | Estado del pago |
| shipping_address | jsonb | YES | NULL | Dirección de envío |
| notes | text | YES | NULL | Notas adicionales |
| external_reference | text | YES | NULL | Referencia externa |

**Índices**:
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (status)
- INDEX (created_at)

**Uso en código**: **MUY UTILIZADA** - Referencias en:
- `app/admin/(dashboard)/orders/`
- `app/api/orders/`
- `components/order-management.tsx`
- `lib/order-service.ts`
- `app/api/auto-assign/orders/`

---

### 3. **profiles** 👤
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 13

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | NULL | ID único del perfil (FK a auth.users) |
| email | text | YES | NULL | Email del usuario |
| full_name | text | YES | NULL | Nombre completo |
| avatar_url | text | YES | NULL | URL del avatar |
| phone | text | YES | NULL | Teléfono |
| address | jsonb | YES | NULL | Dirección |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |
| role | text | YES | 'user'::text | Rol del usuario |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (email)
- INDEX (role)

**Uso en código**: **CRÍTICA PARA AUTENTICACIÓN** - Referencias en:
- `lib/auth-helpers.ts`
- `hooks/use-auth.ts`
- `app/api/auto-assign/`
- `components/auth/`
- `app/admin/(dashboard)/users/`

---
b
### 4. **unified_subscriptions** 🔄
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 2

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la suscripción |
| user_id | uuid | NO | NULL | ID del usuario (FK a profiles) |
| status | text | NO | 'active'::text | Estado de la suscripción |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |
| subscription_type_id | uuid | YES | NULL | ID del tipo de suscripción |
| next_billing_date | date | YES | NULL | Próxima fecha de facturación |
| billing_cycle | text | YES | 'monthly'::text | Ciclo de facturación |
| amount | numeric | YES | NULL | Monto de la suscripción |
| stripe_subscription_id | text | YES | NULL | ID de suscripción en Stripe |
| stripe_customer_id | text | YES | NULL | ID de cliente en Stripe |
| trial_end_date | date | YES | NULL | Fecha de fin del período de prueba |
| canceled_at | timestamp with time zone | YES | NULL | Fecha de cancelación |
| pause_start_date | date | YES | NULL | Fecha de inicio de pausa |
| pause_end_date | date | YES | NULL | Fecha de fin de pausa |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (stripe_subscription_id)
- INDEX (user_id)
- INDEX (status)
- INDEX (next_billing_date)

**Uso en código**: **CRÍTICA PARA SUSCRIPCIONES** - Referencias en:
- `lib/query-optimizations.ts`
- `app/api/subscriptions/`
- `components/subscription-management.tsx`
- `app/admin/(dashboard)/subscriptions/`

---

### 5. **order_items** 📋
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 1

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del item |
| order_id | uuid | NO | NULL | ID de la orden (FK a orders) |
| product_id | uuid | NO | NULL | ID del producto (FK a products) |
| quantity | integer | NO | 1 | Cantidad del producto |
| price | numeric | NO | NULL | Precio unitario |
| total | numeric | NO | NULL | Total del item |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| product_size_id | uuid | YES | NULL | ID del tamaño (FK a product_sizes) |

**Índices**:
- PRIMARY KEY (id)
- INDEX (order_id)
- INDEX (product_id)

**Uso en código**: **UTILIZADA EN ÓRDENES** - Referencias en:
- `app/api/orders/`
- `components/order-details.tsx`
- `lib/order-service.ts`

---

### 6. **product_features** ⭐
**Estado**: ✅ **UTILIZADA** | **Registros**: 41

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la característica |
| product_id | uuid | NO | NULL | ID del producto (FK a products) |
| feature_name | text | NO | NULL | Nombre de la característica |
| feature_value | text | YES | NULL | Valor de la característica |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (product_id)

**Uso en código**: **UTILIZADA** - Referencias en:
- `components/product-details.tsx`
- `app/admin/(dashboard)/products/`

---

### 7. **product_images** 🖼️
**Estado**: ✅ **UTILIZADA** | **Registros**: 34

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la imagen |
| product_id | uuid | NO | NULL | ID del producto (FK a products) |
| image_url | text | NO | NULL | URL de la imagen |
| alt_text | text | YES | NULL | Texto alternativo |
| display_order | integer | YES | 0 | Orden de visualización |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (product_id)
- INDEX (display_order)

**Uso en código**: **UTILIZADA** - Referencias en:
- `components/product-gallery.tsx`
- `app/admin/(dashboard)/products/`

---

### 8. **product_sizes** 📏
**Estado**: ✅ **UTILIZADA** | **Registros**: 41

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del tamaño |
| product_id | uuid | NO | NULL | ID del producto (FK a products) |
| size_name | text | NO | NULL | Nombre del tamaño |
| price_modifier | numeric | YES | 0 | Modificador de precio |
| stock_quantity | integer | YES | 0 | Cantidad en stock |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (product_id)

**Uso en código**: **UTILIZADA** - Referencias en:
- `components/product-size-selector.tsx`
- `app/admin/(dashboard)/products/`

---

### 9. **categories** 📂
**Estado**: ✅ **UTILIZADA** | **Registros**: 4

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la categoría |
| name | text | NO | NULL | Nombre de la categoría |
| slug | text | NO | NULL | URL amigable |
| description | text | YES | NULL | Descripción |
| image | text | YES | NULL | Imagen de la categoría |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (slug)

**Uso en código**: **UTILIZADA** - Referencias en:
- `app/categorias/page.tsx`
- `components/category-filter.tsx`
- `app/admin/(dashboard)/categories/`

---

### 10. **webhook_logs** 📡
**Estado**: ✅ **ACTIVAMENTE UTILIZADA** | **Registros**: 9

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del log |
| webhook_type | text | YES | NULL | Tipo de webhook |
| payload | jsonb | YES | NULL | Payload del webhook |
| status | text | YES | 'received'::text | Estado del procesamiento |
| processed_at | timestamp with time zone | YES | NULL | Fecha de procesamiento |
| error_message | text | YES | NULL | Mensaje de error |
| external_id | text | YES | NULL | ID externo |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (webhook_type)
- INDEX (status)
- INDEX (external_id)

**Uso en código**: **MUY UTILIZADA** - Referencias en:
- `app/api/webhooks/`
- `lib/webhook-processor.ts`
- `app/admin/(dashboard)/webhooks/`

---

### 11. **email_logs** 📧
**Estado**: ✅ **UTILIZADA** | **Registros**: 6

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del log |
| to_email | text | YES | NULL | Email destinatario |
| subject | text | YES | NULL | Asunto del email |
| content | text | YES | NULL | Contenido del email |
| status | text | YES | 'pending'::text | Estado del envío |
| sent_at | timestamp with time zone | YES | NULL | Fecha de envío |
| error_message | text | YES | NULL | Mensaje de error |
| email_type | text | YES | NULL | Tipo de email |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (to_email)
- INDEX (status)
- INDEX (email_type)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/email-service.ts`
- `app/api/notifications/`
- `app/admin/(dashboard)/emails/`

---

### 12. **product_subscription_config** ⚙️
**Estado**: ✅ **UTILIZADA** | **Registros**: 246

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de configuración |
| product_id | uuid | NO | NULL | ID del producto (FK a products) |
| subscription_type | text | YES | NULL | Tipo de suscripción |
| discount_percentage | numeric | YES | NULL | Porcentaje de descuento |
| min_frequency_days | integer | YES | NULL | Frecuencia mínima en días |
| max_frequency_days | integer | YES | NULL | Frecuencia máxima en días |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (product_id)
- INDEX (subscription_type)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/subscription-config.ts`
- `app/admin/(dashboard)/subscription-config/`

---

### 13. **subscription_types** 🏷️
**Estado**: ✅ **UTILIZADA** | **Registros**: 5

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del tipo |
| name | text | YES | NULL | Nombre del tipo |
| description | text | YES | NULL | Descripción |
| frequency_days | integer | YES | NULL | Frecuencia en días |
| discount_percentage | numeric | YES | NULL | Porcentaje de descuento |
| is_active | boolean | YES | true | Estado activo |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (is_active)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/subscription-types.ts`
- `app/admin/(dashboard)/subscription-types/`

---

### 14. **idempotency_results** 🔒
**Estado**: ✅ **UTILIZADA** | **Registros**: 6

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del resultado |
| operation_key | text | NO | NULL | Clave de operación |
| result_data | jsonb | YES | NULL | Datos del resultado |
| expires_at | timestamp with time zone | NO | NULL | Fecha de expiración |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (operation_key)
- INDEX (expires_at)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/idempotency-service.ts`
- `app/api/payments/`

---

### 15. **blog_categories** 📝
**Estado**: ✅ **UTILIZADA** | **Registros**: 0

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único de la categoría |
| name | text | NO | NULL | Nombre de la categoría |
| slug | text | NO | NULL | URL amigable |
| description | text | YES | NULL | Descripción |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (slug)

**⚠️ CANDIDATA PARA ELIMINACIÓN**: No se encontró uso en el código y está vacía

---

### 16. **blogs** 📰
**Estado**: ✅ **UTILIZADA** | **Registros**: 0

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del blog |
| title | text | NO | NULL | Título del blog |
| slug | text | NO | NULL | URL amigable |
| content | text | YES | NULL | Contenido |
| excerpt | text | YES | NULL | Extracto |
| featured_image | text | YES | NULL | Imagen destacada |
| category_id | uuid | YES | NULL | ID de categoría (FK a blog_categories) |
| author_id | uuid | YES | NULL | ID del autor (FK a profiles) |
| status | text | YES | 'draft'::text | Estado del blog |
| published_at | timestamp with time zone | YES | NULL | Fecha de publicación |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |
| updated_at | timestamp with time zone | YES | now() | Fecha de actualización |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (slug)
- INDEX (category_id)
- INDEX (author_id)
- INDEX (status)

**⚠️ CANDIDATA PARA ELIMINACIÓN**: No se encontró uso en el código y está vacía

---

### 17. **billing_history** 💰
**Estado**: ✅ **UTILIZADA** | **Registros**: 0

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del historial |
| user_id | uuid | YES | NULL | ID del usuario (FK a profiles) |
| subscription_id | uuid | YES | NULL | ID de suscripción (FK a unified_subscriptions) |
| amount | numeric | YES | NULL | Monto facturado |
| billing_date | timestamp with time zone | YES | NULL | Fecha de facturación |
| status | text | YES | 'pending'::text | Estado de la facturación |
| payment_method | text | YES | NULL | Método de pago |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (subscription_id)
- INDEX (billing_date)
- INDEX (status)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/query-optimizations.ts`
- `app/admin/(dashboard)/billing/`

---

### 18. **idempotency_locks** 🔐
**Estado**: ✅ **UTILIZADA** | **Registros**: null

| Columna | Tipo | Nulo | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único del lock |
| lock_key | text | NO | NULL | Clave del lock |
| expires_at | timestamp with time zone | NO | NULL | Fecha de expiración |
| created_at | timestamp with time zone | YES | now() | Fecha de creación |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (lock_key)
- INDEX (expires_at)

**Uso en código**: **UTILIZADA** - Referencias en:
- `lib/idempotency-service.ts`
- `app/api/payments/`

---

## 🔗 Relaciones Principales

### Mapa de Relaciones

```
profiles (usuarios)
├── orders (user_id)
├── unified_subscriptions (user_id)
└── billing_history (user_id)

products (catálogo)
├── order_items (product_id)
├── product_features (product_id)
├── product_images (product_id)
├── product_sizes (product_id)
├── product_subscription_config (product_id)
└── unified_subscriptions (product_id)

categories
└── products (category_id)

orders
└── order_items (order_id)

unified_subscriptions
└── billing_history (subscription_id)

blog_categories
└── blogs (category_id)
```

---

## 📊 Estadísticas Detalladas

### Distribución de Registros

| Tabla | Registros | % del Total | Estado |
|-------|-----------|-------------|--------|
| product_subscription_config | 246 | 57.2% | ✅ Activa |
| products | 41 | 9.5% | ✅ Activa |
| product_features | 41 | 9.5% | ✅ Activa |
| product_sizes | 41 | 9.5% | ✅ Activa |
| product_images | 34 | 7.9% | ✅ Activa |
| orders | 32 | 7.4% | ✅ Activa |
| profiles | 13 | 3.0% | ✅ Activa |
| webhook_logs | 9 | 2.1% | ✅ Activa |
| email_logs | 6 | 1.4% | ✅ Activa |
| idempotency_results | 6 | 1.4% | ✅ Activa |
| subscription_types | 5 | 1.2% | ✅ Activa |
| categories | 4 | 0.9% | ✅ Activa |
| unified_subscriptions | 2 | 0.5% | ✅ Activa |
| order_items | 1 | 0.2% | ✅ Activa |
| **Tablas vacías** | | | |
| blog_categories | 0 | 0% | ✅ Activa |
| blogs | 0 | 0% | ✅ Activa |
| billing_history | 0 | 0% | ✅ Activa |
| idempotency_locks | null | - | ✅ Activa |

---
*Documento generado automáticamente desde Supabase el 25 de enero de 2025*  
*Total de tablas analizadas: 18*  
*Total de registros: 430*