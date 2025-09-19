# Scripts de Validación de Suscripciones

## test-subscription-fields.js

Script integral para validar que todos los campos críticos se guarden correctamente en la tabla `unified_subscriptions`.

### Campos Críticos Validados

El script verifica que las siguientes propiedades estén presentes y no vacías:

- **Información del Producto:**
  - `product_name` - Nombre del producto
  - `product_image` - URL de la imagen del producto
  - `product_id` - ID del producto
  - `size` - Tamaño del producto

- **Información de Precios:**
  - `transaction_amount` - Monto de la transacción
  - `base_price` - Precio base
  - `discounted_price` - Precio con descuento
  - `discount_percentage` - Porcentaje de descuento

- **Metadatos:**
  - `processed_at` - Timestamp de procesamiento
  - `cart_items` - Items del carrito (JSON)
  - `customer_data` - Datos del cliente (JSON)

### Configuración

1. **Variables de Entorno Requeridas:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

2. **Instalación de Dependencias:**
   ```bash
   npm install @supabase/supabase-js
   ```

### Uso

#### Ejecución Directa
```bash
node scripts/test-subscription-fields.js
```

#### Como Módulo
```javascript
const { runValidation, validateSubscriptionFields } = require('./scripts/test-subscription-fields')

// Ejecutar validación completa
await runValidation()

// Validar una suscripción específica
const result = validateSubscriptionFields(subscription, 'source')
```

### Interpretación de Resultados

#### Reporte de Validación

El script genera un reporte detallado que incluye:

1. **Resumen General:**
   - Total de suscripciones analizadas
   - Número de suscripciones válidas/inválidas
   - Porcentaje de éxito

2. **Suscripciones Problemáticas:**
   - ID de la suscripción
   - Estado actual
   - Campos faltantes o vacíos
   - Campos presentes

3. **Análisis por Campo:**
   - Porcentaje de éxito por cada campo crítico
   - Número de campos faltantes/vacíos

#### Niveles de Alerta

- **🎉 EXCELENTE (100%):** Todas las suscripciones tienen todos los campos
- **⚠️ BUENO (≥80%):** La mayoría tienen los campos, revisar casos problemáticos
- **❌ CRÍTICO (<80%):** Muchas suscripciones con campos faltantes, acción requerida

### Casos de Uso

1. **Validación Post-Implementación:**
   - Ejecutar después de implementar correcciones
   - Verificar que los nuevos registros tengan todos los campos

2. **Monitoreo Regular:**
   - Incluir en procesos de CI/CD
   - Ejecutar semanalmente para detectar regresiones

3. **Auditoría de Datos:**
   - Identificar suscripciones con datos incompletos
   - Planificar migraciones de datos si es necesario

4. **Debugging:**
   - Identificar qué funciones no están guardando campos específicos
   - Validar correcciones en tiempo real

### Próximos Pasos Recomendados

Si el script identifica problemas:

1. **Revisar Funciones de Creación:**
   - `createPendingSubscription` en `dynamic-discount-service.ts`
   - `handleSubscriptionPreapproval` en `webhook-service.ts`
   - `handleSubscriptionPayment` en `webhook-service.ts`
   - Rutas API en `create-without-plan/route.ts`

2. **Implementar Correcciones:**
   - Asegurar que todos los campos se capturen en el frontend
   - Verificar que se pasen correctamente a las funciones backend
   - Confirmar que se guarden en la base de datos

3. **Validar Correcciones:**
   - Ejecutar el script nuevamente
   - Crear suscripciones de prueba
   - Verificar que el porcentaje de éxito mejore

4. **Migración de Datos (si es necesario):**
   - Identificar suscripciones existentes con campos faltantes
   - Crear scripts de migración para completar datos
   - Ejecutar en entorno de staging primero

### Mantenimiento

- **Actualizar campos críticos:** Modificar el array `CRITICAL_FIELDS` si se agregan nuevos campos requeridos
- **Ajustar límites:** Cambiar el `limit(50)` si necesitas analizar más suscripciones
- **Personalizar filtros:** Modificar la consulta para analizar suscripciones específicas por fecha, estado, etc.