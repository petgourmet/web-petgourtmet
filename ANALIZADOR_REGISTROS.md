# Analizador de Registros - Pet Gourmet

## 📋 Resumen

Herramienta desarrollada para determinar si un registro específico es una **compra única**, **suscripción** o **pago de suscripción** mediante el análisis automático de múltiples tablas de la base de datos.

## 🎯 Problema Resuelto

Cuando tienes registros como el que mostraste:
- **Cliente**: bautista aa
- **Email**: cliente@petgourmet.mx
- **Teléfono**: 6444052511
- **Orden**: PG1753892928233
- **Producto**: Plan de Pollo - Cantidad: 1 - Precio: $45

La herramienta analiza automáticamente todas las tablas relevantes para determinar la naturaleza exacta del registro.

## 🔧 Archivos Creados

### 1. API de Análisis
- **Archivo**: `app/api/debug/analyze-records/route.ts`
- **Función**: Analiza registros en múltiples tablas de la base de datos
- **Endpoint**: `POST /api/debug/analyze-records`

### 2. Interfaz de Usuario
- **Archivo**: `app/analyze-records/page.tsx`
- **Función**: Interfaz web para ingresar datos y ver resultados
- **URL**: `http://localhost:3002/analyze-records`

### 3. Scripts SQL
- **Archivo**: `sql/analyze_user_records.sql`
- **Función**: Consultas SQL manuales para análisis directo en base de datos

## 🔍 Tablas Analizadas

La herramienta busca en las siguientes tablas:

### 1. **orders**
- Busca por: `customer_email`, `customer_name`, `external_reference`, `total`
- Indica: **Compra única** si solo aparece aquí

### 2. **user_subscriptions**
- Busca por: `product_name`, `base_price`, `discounted_price`, `user_id`
- Indica: **Suscripción activa** si `is_active = true`

### 3. **order_items**
- Busca por: `product_name`, `price`, `order_id`
- Indica: **Items de compra** específicos

### 4. **subscription_billing_history**
- Busca por: `amount`, `user_id`, `billing_date`
- Indica: **Pago de suscripción** procesado

### 5. **subscription_payments**
- Busca por: `amount`, `external_reference`, `mercadopago_payment_id`
- Indica: **Pago de MercadoPago** para suscripción

### 6. **profiles**
- Busca por: `email`, `full_name`, `phone`
- Proporciona: **Información del cliente**

## 📊 Tipos de Resultado

### 🟣 **SUBSCRIPTION_PAYMENT**
- **Significado**: Es un pago de una suscripción existente
- **Evidencia**: Aparece en `user_subscriptions` + `subscription_billing_history` o `subscription_payments`
- **Acción**: El cliente tiene una suscripción activa y se procesó un pago

### 🔵 **SUBSCRIPTION**
- **Significado**: Es una suscripción registrada
- **Evidencia**: Aparece en `user_subscriptions` con `is_active = true`
- **Acción**: El cliente tiene una suscripción pero puede no haber pagos recientes

### 🟢 **SINGLE_PURCHASE**
- **Significado**: Es una compra única
- **Evidencia**: Aparece solo en `orders` y/o `order_items`
- **Acción**: Compra normal sin suscripción

### 🟡 **PARTIAL_MATCH**
- **Significado**: Se encontraron registros pero no coinciden completamente
- **Evidencia**: Datos parciales en múltiples tablas
- **Acción**: Revisar manualmente

### 🔴 **NOT_FOUND**
- **Significado**: No se encontraron registros
- **Evidencia**: Ninguna tabla contiene información coincidente
- **Acción**: Verificar datos o buscar en otras fuentes

## 🎮 Cómo Usar la Herramienta

### Opción 1: Interfaz Web (Recomendado)

1. **Acceder**: `http://localhost:3002/analyze-records`
2. **Completar formulario** con los datos del registro:
   - Email del Cliente: `cliente@petgourmet.mx`
   - Nombre del Cliente: `bautista aa`
   - Teléfono: `6444052511`
   - Número de Orden: `PG1753892928233`
   - Nombre del Producto: `Plan de Pollo`
   - Monto: `45`
3. **Hacer clic** en "Analizar Registro"
4. **Revisar resultados** en las pestañas de detalles

### Opción 2: API Directa

```bash
curl -X POST http://localhost:3002/api/debug/analyze-records \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "cliente@petgourmet.mx",
    "customerName": "bautista aa",
    "orderNumber": "PG1753892928233",
    "productName": "Plan de Pollo",
    "amount": 45,
    "phone": "6444052511"
  }'
```

### Opción 3: SQL Manual

```sql
-- Ejecutar las consultas del archivo sql/analyze_user_records.sql
-- en tu cliente de base de datos preferido
```

## 📈 Interpretación de Resultados

### Nivel de Confianza
- **70-100%**: Alta confianza - Resultado muy probable
- **40-69%**: Confianza media - Revisar evidencia
- **0-39%**: Baja confianza - Verificar manualmente

### Evidencia Típica
- ✅ "Usuario encontrado en profiles"
- ✅ "Coincidencia exacta encontrada: Orden X con total $Y"
- ✅ "N suscripción(es) activa(s) encontrada(s)"
- ✅ "Item exacto encontrado: Producto - $Precio"
- ✅ "N pago(s) de suscripción encontrado(s)"

## 🔧 Para tu Caso Específico

Basándome en los datos que proporcionaste:

```
Cliente: bautista aa
Email: cliente@petgourmet.mx
Teléfono: 6444052511
Orden: PG1753892928233
Producto: Plan de Pollo - $45
```

**Predicción**: Probablemente es una **SUSCRIPCIÓN** o **SUBSCRIPTION_PAYMENT** porque:
1. "Plan de Pollo" sugiere un producto de suscripción
2. El precio $45 es típico de planes mensuales
3. El formato de orden PG + timestamp es consistente con suscripciones

## 🚀 Próximos Pasos

1. **Ejecutar análisis** con la herramienta
2. **Revisar resultado** y nivel de confianza
3. **Verificar evidencia** en las pestañas de detalles
4. **Tomar acción** según el tipo de registro identificado

## 🛠️ Mantenimiento

### Agregar Nueva Tabla
Para incluir una nueva tabla en el análisis:

1. Agregar consulta en `app/api/debug/analyze-records/route.ts`
2. Incluir en el objeto `results.tables`
3. Actualizar lógica de análisis final
4. Agregar pestaña en la interfaz web

### Mejorar Criterios de Búsqueda
Para mejorar la precisión:

1. Ajustar consultas SQL en la API
2. Modificar lógica de confianza
3. Agregar nuevos tipos de evidencia
4. Actualizar recomendaciones

## 📞 Soporte

Si la herramienta no proporciona resultados claros:

1. **Verificar datos**: Asegurar que los datos ingresados son correctos
2. **Revisar logs**: Consultar la consola del navegador para errores
3. **Consulta manual**: Usar los scripts SQL directamente
4. **Contactar soporte**: Proporcionar los datos específicos del caso

---

**¡La herramienta está lista para usar!** 🎉

Accede a `http://localhost:3002/analyze-records` y analiza tus registros de inmediato.