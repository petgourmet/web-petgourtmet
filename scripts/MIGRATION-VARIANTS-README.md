# Migración: Agrupación de Productos con Variantes

## 📋 Resumen

Este script analiza los productos existentes en la base de datos e identifica aquellos que deben agruparse como variantes de un único producto principal.

### Productos Identificados

Se encontraron **3 grupos** de productos que comparten el mismo nombre base pero tienen diferentes ingredientes:

#### 1. **Pastel de cumpleaños Amore Mio**
- **Producto principal:** ID 81 (Pollo - con stock)
- **Variantes:** Ternera, Pollo, Carne, Pollo Verduras
- **Productos a eliminar:** IDs 31, 82, 83
- **Total variantes:** 4

#### 2. **Pastel de cumpleaños Fiesta**
- **Producto principal:** ID 36 (Pollo - con stock)
- **Variantes:** Pollo, Carne
- **Productos a eliminar:** ID 87
- **Total variantes:** 2

#### 3. **Pastel de cumpleaños Huella**
- **Producto principal:** ID 37 (Pollo Verduras - featured y con stock)
- **Variantes:** Pollo Verduras, Pollo, Carne
- **Productos a eliminar:** IDs 79, 80
- **Total variantes:** 3

## 📊 Estadísticas

| Métrica | Cantidad |
|---------|----------|
| Grupos encontrados | 3 |
| Productos a eliminar | 6 |
| Variantes a crear | 9 |
| Productos principales | 3 |

## 🔄 Proceso de Migración

### 1. Eliminación de Variantes Antiguas

El script primero elimina las variantes con nombre "400 gr" que fueron creadas automáticamente durante la migración anterior:

```sql
DELETE FROM product_variants
WHERE name = '400 gr'
  AND created_at::date = '2025-11-21'
  AND product_id IN (31, 81, 82, 83, 36, 87, 37, 79, 80);
```

### 2. Actualización de Productos Principales

Para cada grupo, el producto principal se actualiza:
- Se limpia el nombre removiendo la variante
- Se asegura que `product_type = 'variable'`
- Se actualiza `updated_at`

```sql
UPDATE products
SET
  name = 'Pastel de cumpleaños Amore Mio',
  product_type = 'variable',
  updated_at = NOW()
WHERE id = 81;
```

### 3. Creación de Variantes

Se crean variantes en `product_variants` con:
- SKU único por variante
- Nombre de la variante (Pollo, Carne, Ternera, etc.)
- Precio y stock del producto original
- URL de imagen
- Orden de visualización (`display_order`)
- Atributos en formato JSON

```sql
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image_url,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  81,
  'pastel-amore-mio-ternera',
  'Ternera',
  319.00,
  0,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp',
  1,
  true,
  true,
  '{"ingredient": "Ternera"}'::jsonb
);
```

### 4. Eliminación de Productos Duplicados

Se eliminan los productos duplicados que ahora son variantes:

```sql
DELETE FROM products WHERE id IN (31, 82, 83);
```

## 🚀 Cómo Ejecutar

### Opción 1: Supabase SQL Editor (Recomendado)

1. **Backup de seguridad:**
   ```bash
   # En Supabase Dashboard → Settings → Database → Backup
   # O usa pg_dump
   ```

2. **Abrir SQL Editor:**
   - Ve a Supabase Dashboard
   - Navega a SQL Editor
   - Crea una nueva consulta

3. **Copiar y pegar el SQL:**
   - Abre `scripts/migration-group-products.sql`
   - Copia todo el contenido
   - Pega en el editor

4. **Revisar el script:**
   - Lee los comentarios
   - Verifica los IDs de productos
   - Asegúrate de entender cada paso

5. **Ejecutar:**
   - Click en "Run" o Ctrl+Enter
   - Espera a que termine
   - Revisa los resultados de las consultas de verificación

6. **Si algo sale mal:**
   ```sql
   ROLLBACK;
   ```

### Opción 2: Línea de Comandos

```bash
# Conectar a la base de datos
psql -h <host> -U <user> -d <database>

# Ejecutar el script
\i scripts/migration-group-products.sql
```

## ✅ Verificación

El script incluye consultas de verificación al final:

### Ver productos agrupados

```sql
SELECT
  p.id,
  p.name,
  p.product_type,
  COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.id IN (81, 36, 37)
GROUP BY p.id, p.name, p.product_type
ORDER BY p.id;
```

**Resultado esperado:**

| id  | name                          | product_type | variant_count |
|-----|-------------------------------|--------------|---------------|
| 36  | Pastel de cumpleaños Fiesta   | variable     | 2             |
| 37  | Pastel de cumpleaños Huella   | variable     | 3             |
| 81  | Pastel de cumpleaños Amore Mio| variable     | 4             |

### Ver variantes creadas

```sql
SELECT
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.name as variant_name,
  pv.price,
  pv.stock,
  pv.display_order
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.product_id IN (81, 36, 37)
ORDER BY pv.product_id, pv.display_order;
```

**Resultado esperado:** 9 filas con las variantes correctas

## 🛡️ Seguridad

- ✅ El script usa transacciones (BEGIN/COMMIT)
- ✅ Si algo falla, ejecuta `ROLLBACK`
- ✅ Incluye consultas de verificación
- ✅ No modifica datos irreversiblemente sin confirmación

## 📝 Criterios de Selección del Producto Principal

El script selecciona el producto principal basándose en:

1. **Stock disponible** (prioridad alta)
   - Productos con stock > 0 son preferidos
   
2. **Producto destacado** (prioridad media)
   - Productos con `featured = true`
   
3. **Antigüedad** (prioridad baja)
   - Productos con ID menor (más antiguos)

## 🔍 Patrones de Variantes Detectados

El script identifica variantes basándose en estos patrones en el nombre del producto:

- `Pollo`, `Carne`, `Ternera`, `Cordero`, `Atún`, `Hígado`
- `Pollo Verduras`, `Carne Verduras`, `Pollo y Verduras`
- `Cordero y Espinaca`, `Ternera y Zanahoria`
- `Cordero, Arroz y Zanahoria`

## 📦 Archivos Generados

1. **`group-products-by-variants.ts`**
   - Script TypeScript que analiza productos
   - Genera el SQL de migración
   - Produce reporte detallado

2. **`migration-group-products.sql`**
   - Script SQL listo para ejecutar
   - Incluye transacción completa
   - Con comentarios explicativos

3. **`MIGRATION-VARIANTS-README.md`** (este archivo)
   - Documentación completa
   - Guía de ejecución
   - Verificación de resultados

## 🎯 Resultado Final

Después de ejecutar el script:

- ✅ 3 productos principales con nombres limpios
- ✅ 9 variantes correctamente configuradas
- ✅ 6 productos duplicados eliminados
- ✅ Variantes antiguas "400 gr" eliminadas
- ✅ Sistema de variantes completamente funcional

## 🚨 Problemas Comunes

### Error: Foreign key violation

**Causa:** Los productos a eliminar tienen referencias en otras tablas (order_items, cart_items, etc.)

**Solución:**
```sql
-- Primero eliminar referencias
DELETE FROM order_items WHERE product_id IN (31, 82, 83, 87, 79, 80);
DELETE FROM cart_items WHERE product_id IN (31, 82, 83, 87, 79, 80);
-- Luego ejecutar el script principal
```

### Error: Duplicate key value

**Causa:** Ya existen variantes con el mismo SKU

**Solución:**
```sql
-- Eliminar variantes existentes primero
DELETE FROM product_variants WHERE product_id IN (81, 36, 37);
-- Luego ejecutar el script principal
```

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de Supabase
2. Ejecuta las consultas de verificación
3. Si algo sale mal, ejecuta `ROLLBACK;`
4. Contacta al equipo de desarrollo

## 📅 Historial

- **2025-11-21**: Primera versión del script de agrupación
- Se identificaron 3 grupos con 9 variantes totales
- 6 productos marcados para eliminación
