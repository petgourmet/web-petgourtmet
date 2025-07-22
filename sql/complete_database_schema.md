# ESQUEMA COMPLETO DE BASE DE DATOS PETGOURMET
## Documentación basada en la imagen de Supabase

---

## 1. TABLA: products
**Columnas:**
- name (text)
- slug (text)
- description (text)
- price (numeric)
- image (text)
- category_id (int8)
- features (text)
- stock (int4)
- created_at (timestamptz)
- updated_at (timestamptz)
- nutritional_info (text)
- ingredients (text)
- rating (numeric)
- reviews (int4)
- subscription_types (jsonb)
- subscription_discount (int4)
- average_rating (numeric)
- review_count (int4)
- nutrition_info (text)
- sale_type (varchar)
- magic_reference (text)
- subscription_available (bool)
- subscription_types (jsonb)
- monthly_discount (numeric)
- quarterly_discount (numeric)
- annual_discount (numeric)
- biweekly_discount (real)

---

## 2. TABLA: user_subscriptions
**Columnas:**
- user_id (uuid)
- product_id (int8)
- subscription_type (varchar)
- id (uuid)
- quantity (int4)
- size (varchar)
- discount_percentage (numeric)
- base_price (numeric)
- discounted_price (numeric)
- next_billing_date (timestamptz)
- last_billing_date (timestamptz)
- cancelled_at (timestamptz)
- product_name (text)
- product_image (text)
- is_default (bool)
- is_active (bool)
- updated_at (timestamptz)
- expires_at (timestamptz)
- mercadopago_subscription_id (text)
- customer_phone (text)
- is_subscription (bool)

---

## 3. TABLA: user_payment_methods
**Columnas:**
- user_id (uuid)
- payment_provider (varchar)
- payment_method_id (varchar)
- payment_method_type (varchar)
- card_last_four (varchar)
- card_brand (varchar)
- card_exp_month (int4)
- card_exp_year (int4)
- cardholder_name (varchar)
- is_default (bool)
- is_active (bool)
- created_at (timestamptz)
- updated_at (timestamptz)
- expires_at (timestamptz)
- shipping_address (jsonb)
- payment_intent_id (text)
- customer_name (text)
- customer_phone (text)

---

## 4. TABLA: subscriptions
**Columnas:**
- id (uuid)
- plan_id (uuid)
- plan_name (varchar)
- status (varchar)
- current_period_start (timestamptz)
- current_period_end (timestamptz)
- cancel_at_period_end (bool)
- updated_at (timestamptz)
- created_at (timestamptz)

---

## 5. TABLA: subscription_modifications
**Columnas:**
- id (uuid)
- subscription_id (uuid)
- user_id (uuid)
- modification_type (varchar)
- old_value (jsonb)
- new_value (jsonb)
- auth_users_id (uuid)
- effective_date (timestamptz)
- created_at (timestamptz)
- notes (text)

---

## 6. TABLA: pets
**Columnas:**
- id (uuid)
- owner_id (uuid)
- name (text)
- species (text)
- age (int4)
- weight (numeric)
- gender (text)
- auth_users_id (uuid)
- activity_level (text)
- allergies (text)
- updated_at (timestamptz)

---

## 7. TABLA: profiles
**Columnas:**
- id (uuid)
- email (text)
- role (varchar)
- created_at (timestamptz)
- updated_at (timestamptz)
- full_name (text)
- phone (text)
- address (text)
- auth_users_id (uuid)
- shipping_address (jsonb)
- first_name (text)
- last_name (text)

---

## 8. TABLA: subscription_billing_history
**Columnas:**
- id (uuid)
- subscription_id (uuid)
- user_id (uuid)
- auth_users_id (uuid)
- payment_method_id (uuid)
- amount (numeric)
- currency (varchar)
- status (varchar)
- payment_provider (varchar)
- payment_intent_id (text)
- invoice_url (text)
- receipt_url (text)
- billing_date (timestamptz)
- processed_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
- metadata (jsonb)

---

## 9. TABLA: subscription_config
**Columnas:**
- id (uuid)
- method (varchar)
- default_discount_per... (varchar)
- config (jsonb)
- updated_at (timestamptz)
- created_at (timestamptz)

---

## 10. TABLA: product_images
**Columnas:**
- id (int8)
- product_id (int8)
- url (text)
- display_order (int4)
- metadata (jsonb)

---

## 11. TABLA: product_features
**Columnas:**
- id (int8)
- product_id (int8)
- name (varchar)
- color (varchar)
- created_at (timestamptz)
- updated_at (timestamptz)

---

## 12. TABLA: order_items
**Columnas:**
- id (uuid)
- order_id (uuid)
- product_name (text)
- product_image (text)
- quantity (int4)
- price (numeric)
- size (varchar)

---

## 13. TABLA: product_reviews
**Columnas:**
- id (uuid)
- product_id (int8)
- user_name (varchar)
- rating (int4)
- comment (text)
- is_verified (bool)
- is_featured (bool)
- created_at (timestamptz)
- updated_at (timestamptz)

---

## 14. TABLA: categories
**Columnas:**
- id (int8)
- name (text)
- slug (text)
- description (text)
- image (text)

---

## 15. TABLA: blogs
**Columnas:**
- id (int8)
- title (text)
- slug (text)
- excerpt (text)
- cover_image (text)
- published (bool)
- created_at (timestamptz)
- updated_at (timestamptz)

---

## 16. TABLA: blog_categories
**Columnas:**
- id (int8)
- name (text)
- slug (text)
- description (text)
- created_at (timestamptz)

---

## 17. TABLA: subscription_payments
**Columnas:**
- id (uuid)
- subscription_id (uuid)
- mercadopago_payment_id (text)
- status (varchar)
- amount (numeric)
- currency_id (varchar)
- payment_date (timestamptz)
- due_date (timestamptz)
- external_reference (text)
- payment_method_id (text)
- payment_status_id (int4)

---

## 18. TABLA: scheduled_notifications
**Columnas:**
- id (int8)
- subscription_id (uuid)
- notification_type (varchar)
- scheduled_for (timestamptz)
- sent_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)

---

## 19. TABLA: product_sizes
**Columnas:**
- id (int8)
- product_id (int8)
- weight (varchar)
- price (numeric)
- stock (int4)

---

## NOTAS IMPORTANTES:

### 🔍 **OBSERVACIONES CLAVE:**

1. **NO HAY TABLA `orders`** - Solo existe `order_items`
2. **NO HAY TABLA `users`** - Existe `profiles` que parece ser la tabla de usuarios
3. **Estructura de Suscripciones Compleja:**
   - `user_subscriptions` (suscripciones activas por usuario)
   - `subscriptions` (configuraciones generales)
   - `subscription_payments` (pagos)
   - `subscription_billing_history` (historial)
   - `subscription_modifications` (modificaciones)
   - `subscription_config` (configuración del sistema)

4. **Sistema de Productos:**
   - `products` (28 columnas con campos de suscripción)
   - `product_features` (características)
   - `product_images` (galería)
   - `product_sizes` (tamaños y precios)
   - `product_reviews` (reseñas)

5. **Campos de Autenticación:**
   - Muchas tablas tienen `auth_users_id` (referencia a Supabase Auth)
   - `profiles` parece ser la extensión de usuarios

### ⚠️ **CORRECCIONES NECESARIAS EN EL CÓDIGO:**

1. Cambiar `orders` por `order_items` en las consultas
2. Cambiar `users` por `profiles` 
3. Actualizar las relaciones de foreign keys
4. Ajustar las interfaces TypeScript
