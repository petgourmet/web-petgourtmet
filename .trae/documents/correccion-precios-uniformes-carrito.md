# Corrección de Precios Uniformes en el Carrito de Compras

## 1. Problema Identificado

### 1.1 Descripción del Error Principal
Los productos en el carrito muestran **precios uniformes** independientemente de sus precios reales en la base de datos. Esto ocurre debido a:

1. **Tabla product_sizes vacía**: La tabla `product_sizes` no contiene datos de precios específicos por tamaño
2. **Lógica de fallback defectuosa**: Cuando no hay datos en `product_sizes`, se usan tamaños predeterminados con el mismo precio base
3. **Falta de diferenciación de precios**: Todos los productos terminan usando la misma estructura de precios

### 1.2 Ubicación del Problema
**Archivo**: `components/product-category-loader.tsx`  
**Líneas**: 245-249

```typescript
// CÓDIGO PROBLEMÁTICO
let sizes = allSizes?.filter(size => size.product_id === product.id) || []
if (sizes.length === 0) {
  // Tamaños predeterminados si no hay datos
  sizes = [
    { weight: "200g", price: product.price },      // ← Mismo precio base
    { weight: "500g", price: product.price * 2.2 }, // ← Solo multiplicador fijo
  ]
}
```

### 1.3 Impacto del Problema
- **Experiencia del usuario**: Confusión por precios incorrectos
- **Pérdidas financieras**: Productos premium vendidos a precio base
- **Inconsistencia de datos**: Desconexión entre base de datos y frontend

## 2. Análisis Técnico

### 2.1 Flujo Actual (Problemático)
```
Base de Datos:
- Producto A: $150 MXN
- Producto B: $300 MXN
- Producto C: $80 MXN

↓ (product_sizes vacía)

Lógica de Fallback:
- Todos usan product.price como base
- Todos aplican el mismo multiplicador (2.2x)

↓

Resultado en Carrito:
- Producto A: 200g=$150, 500g=$330
- Producto B: 200g=$300, 500g=$660  
- Producto C: 200g=$80, 500g=$176

↓

Problema: Precios no reflejan diferencias reales por tamaño
```

### 2.2 Estructura de Tabla product_sizes
```sql
CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weight TEXT NOT NULL,
  price NUMERIC NOT NULL,  -- ← Este campo debe tener precios específicos
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Solución Técnica

### 3.1 Paso 1: Poblar Tabla product_sizes

#### Script SQL para Migración de Datos
```sql
-- Insertar tamaños con precios diferenciados para productos existentes
INSERT INTO product_sizes (product_id, weight, price, stock)
SELECT 
  p.id as product_id,
  '200g' as weight,
  p.price as price,  -- Precio base para 200g
  100 as stock
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id
);

INSERT INTO product_sizes (product_id, weight, price, stock)
SELECT 
  p.id as product_id,
  '500g' as weight,
  CASE 
    -- Precios específicos por categoría y rango de precio
    WHEN p.price <= 100 THEN p.price * 2.0   -- Productos económicos
    WHEN p.price <= 200 THEN p.price * 2.2   -- Productos medios
    WHEN p.price <= 300 THEN p.price * 2.4   -- Productos premium
    ELSE p.price * 2.5                       -- Productos ultra-premium
  END as price,
  100 as stock
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_sizes ps 
  WHERE ps.product_id = p.id AND ps.weight = '500g'
);

-- Agregar tamaño 1kg para productos premium
INSERT INTO product_sizes (product_id, weight, price, stock)
SELECT 
  p.id as product_id,
  '1kg' as weight,
  CASE 
    WHEN p.price <= 100 THEN p.price * 3.5
    WHEN p.price <= 200 THEN p.price * 3.8
    WHEN p.price <= 300 THEN p.price * 4.0
    ELSE p.price * 4.2
  END as price,
  50 as stock
FROM products p
WHERE p.price >= 150  -- Solo productos de precio medio-alto
AND NOT EXISTS (
  SELECT 1 FROM product_sizes ps 
  WHERE ps.product_id = p.id AND ps.weight = '1kg'
);
```

### 3.2 Paso 2: Mejorar Lógica de Fallback

#### Archivo: `components/product-category-loader.tsx`
**Líneas 245-249 - Reemplazar con:**

```typescript
// CÓDIGO CORREGIDO
let sizes = allSizes?.filter(size => size.product_id === product.id) || []
if (sizes.length === 0) {
  // Tamaños predeterminados con precios diferenciados por producto
  const basePrice = product.price || 0
  
  // Calcular multiplicadores basados en el precio del producto
  const getMultiplier = (targetWeight: string) => {
    switch (targetWeight) {
      case '200g':
        return 1.0  // Precio base
      case '500g':
        // Multiplicador variable según rango de precio
        if (basePrice <= 100) return 2.0
        if (basePrice <= 200) return 2.2
        if (basePrice <= 300) return 2.4
        return 2.5
      case '1kg':
        // Solo para productos premium
        if (basePrice >= 150) {
          if (basePrice <= 200) return 3.8
          if (basePrice <= 300) return 4.0
          return 4.2
        }
        return null  // No disponible para productos económicos
      default:
        return 1.0
    }
  }
  
  sizes = [
    { weight: "200g", price: basePrice },
    { weight: "500g", price: basePrice * getMultiplier('500g') }
  ]
  
  // Agregar 1kg solo para productos premium
  const kgMultiplier = getMultiplier('1kg')
  if (kgMultiplier) {
    sizes.push({ weight: "1kg", price: basePrice * kgMultiplier })
  }
}
```

### 3.3 Paso 3: Validación de Datos

#### Script de Verificación
```sql
-- Verificar que todos los productos tengan tamaños
SELECT 
  p.id,
  p.name,
  p.price as base_price,
  COUNT(ps.id) as sizes_count,
  STRING_AGG(ps.weight || ':$' || ps.price, ', ') as available_sizes
FROM products p
LEFT JOIN product_sizes ps ON p.id = ps.product_id
GROUP BY p.id, p.name, p.price
ORDER BY sizes_count ASC, p.price DESC;

-- Identificar productos sin tamaños
SELECT p.id, p.name, p.price
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id
);
```

## 4. Plan de Implementación

### 4.1 Fase 1: Preparación de Datos (Crítica)
1. **Ejecutar migración SQL** para poblar `product_sizes`
2. **Verificar integridad** de datos con scripts de validación
3. **Backup de seguridad** antes de cambios

### 4.2 Fase 2: Actualización de Código
1. **Modificar** `product-category-loader.tsx` con nueva lógica
2. **Probar** carga de productos en diferentes categorías
3. **Validar** precios en carrito

### 4.3 Fase 3: Verificación
1. **Probar productos** de diferentes rangos de precio
2. **Verificar cálculos** en carrito y checkout
3. **Confirmar** que precios reflejan diferencias reales

## 5. Casos de Prueba

### 5.1 Producto Económico ($80 MXN)
- **200g**: $80.00 MXN
- **500g**: $160.00 MXN (multiplicador 2.0)
- **1kg**: No disponible

### 5.2 Producto Medio ($150 MXN)
- **200g**: $150.00 MXN
- **500g**: $330.00 MXN (multiplicador 2.2)
- **1kg**: $570.00 MXN (multiplicador 3.8)

### 5.3 Producto Premium ($300 MXN)
- **200g**: $300.00 MXN
- **500g**: $720.00 MXN (multiplicador 2.4)
- **1kg**: $1,200.00 MXN (multiplicador 4.0)

### 5.4 Producto Ultra-Premium ($500 MXN)
- **200g**: $500.00 MXN
- **500g**: $1,250.00 MXN (multiplicador 2.5)
- **1kg**: $2,100.00 MXN (multiplicador 4.2)

## 6. Monitoreo y Mantenimiento

### 6.1 Alertas de Datos
```sql
-- Query para detectar productos sin tamaños (ejecutar diariamente)
SELECT COUNT(*) as productos_sin_tamanos
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id
);
```

### 6.2 Validación de Precios
```sql
-- Detectar precios inconsistentes
SELECT 
  p.name,
  p.price as base_price,
  ps.weight,
  ps.price as size_price,
  ROUND(ps.price / p.price, 2) as multiplier
FROM products p
JOIN product_sizes ps ON p.id = ps.product_id
WHERE ps.price < p.price  -- Precios de tamaño menores al base (error)
OR (ps.weight = '200g' AND ps.price != p.price)  -- 200g debe ser precio base
ORDER BY p.name, ps.weight;
```

## 7. Beneficios Esperados

### 7.1 Técnicos
- **Consistencia de datos**: Precios reflejan valores reales de BD
- **Escalabilidad**: Sistema preparado para nuevos productos
- **Mantenibilidad**: Lógica clara y documentada

### 7.2 Comerciales
- **Precios correctos**: Cada producto refleja su valor real
- **Diferenciación**: Productos premium destacan apropiadamente
- **Confianza**: Usuarios ven precios consistentes y lógicos

### 7.3 Operacionales
- **Gestión simplificada**: Admin puede configurar precios por tamaño
- **Flexibilidad**: Diferentes estrategias de precio por categoría
- **Auditoría**: Trazabilidad completa de cambios de precios

## 8. Riesgos y Mitigación

### 8.1 Riesgo: Migración de Datos
- **Problema**: Pérdida de datos durante migración
- **Mitigación**: Backup completo + transacciones SQL

### 8.2 Riesgo: Precios Incorrectos
- **Problema**: Multiplicadores inadecuados
- **Mitigación**: Validación exhaustiva + rollback plan

### 8.3 Riesgo: Performance
- **Problema**: Consultas más complejas
- **Mitigación**: Índices optimizados + cache de productos

## 9. Próximos Pasos

1. **Inmediato**: Ejecutar migración de datos en entorno de desarrollo
2. **Corto plazo**: Implementar cambios de código y probar
3. **Medio plazo**: Desplegar en producción con monitoreo
4. **Largo plazo**: Implementar interfaz admin para gestión de precios