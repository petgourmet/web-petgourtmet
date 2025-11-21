# 🎨 Sistema de Variantes de Productos - Pet Gourmet

## 📋 Descripción

Este sistema permite gestionar productos simples y productos con variantes (tamaño, sabor, color, etc.) de forma flexible y escalable.

## 🚀 Instalación

### 1. Ejecutar el Script SQL en Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a la sección **SQL Editor**
3. Crea una nueva query
4. Copia y pega todo el contenido del archivo:
   ```
   supabase/migrations/20251121_product_variants_system.sql
   ```
5. Ejecuta el script (botón "Run" o Ctrl+Enter)
6. Verifica que aparezca el mensaje "MIGRACIÓN COMPLETADA EXITOSAMENTE"

### 2. Verificar las Nuevas Tablas

Deberías ver estas nuevas tablas en tu base de datos:

- ✅ `attribute_types` - Tipos de atributos disponibles (Tamaño, Sabor, Color, etc.)
- ✅ `product_attributes` - Atributos configurados por producto
- ✅ `product_variants` - Variantes específicas con precio y stock
- ✅ Nueva columna `product_type` en tabla `products`

### 3. Acceder al Panel Administrativo

#### Gestión de Tipos de Atributos
```
https://tu-dominio.com/admin/attribute-types
```

Aquí puedes:
- ✨ Crear nuevos tipos de atributos (ej: "Edad", "Material")
- ✏️ Editar tipos existentes
- 🗑️ Eliminar tipos personalizados
- 🔒 Ver tipos del sistema predefinidos

#### Gestión de Productos
```
https://tu-dominio.com/admin/products
```

Ahora verás:
- 📦 **Badge "Simple"** - para productos sin variantes
- 🎨 **Badge "Con Variantes"** - para productos con variantes
- Contador de variantes por producto

## 🎯 Cómo Usar

### Crear un Producto Simple

1. Ve a `/admin/products/new`
2. Selecciona **"Producto Simple"** en el tipo
3. Completa la información básica
4. Establece un precio y stock únicos
5. Guarda

### Crear un Producto con Variantes

1. Ve a `/admin/products/new`
2. Selecciona **"Producto con Variantes"**
3. Completa la información básica
4. Ve a la pestaña **"Variantes"**
5. Añade atributos (ej: Tamaño, Sabor)
6. Define los valores para cada atributo
7. Genera variantes automáticamente o créalas manualmente
8. Establece precio y stock para cada variante
9. Guarda

## 📊 Estructura de Datos

### Tipos de Productos

```typescript
type ProductType = 'simple' | 'variable'
```

### Ejemplo de Producto Simple

```json
{
  "name": "Comedero de Acero",
  "product_type": "simple",
  "price": 299.00,
  "stock": 50
}
```

### Ejemplo de Producto con Variantes

```json
{
  "name": "Croquetas Premium",
  "product_type": "variable",
  "attributes": [
    {
      "type": "size",
      "values": ["500g", "1kg", "2kg"]
    },
    {
      "type": "flavor",
      "values": ["Pollo", "Res", "Salmón"]
    }
  ],
  "variants": [
    {
      "name": "500g - Pollo",
      "attributes": { "size": "500g", "flavor": "Pollo" },
      "price": 199.00,
      "stock": 100
    },
    {
      "name": "1kg - Pollo",
      "attributes": { "size": "1kg", "flavor": "Pollo" },
      "price": 349.00,
      "stock": 75
    }
    // ... más variantes
  ]
}
```

## 🔄 Migración Automática

El script SQL migra automáticamente los productos existentes:

### Productos con `product_sizes`
- Se marcan como `product_type = 'variable'`
- Cada `product_size` se convierte en una `product_variant`
- Se crea un atributo "Tamaño" con todos los tamaños del producto

### Productos sin `product_sizes`
- Se mantienen como `product_type = 'simple'`
- Se crea una variante por defecto con el precio y stock del producto

**✅ Tu sistema actual sigue funcionando sin interrupciones**

## 🎨 Nuevas Funcionalidades

### 1. Tipos de Atributos Personalizados
Crea atributos según tus necesidades:
- 📏 Tamaño (500g, 1kg, 2kg)
- 🍖 Sabor (Pollo, Res, Salmón)
- 🎨 Color (Rojo, Azul, Verde)
- 👶 Edad (Cachorro, Adulto, Senior)
- 🐕 Tamaño de Raza (Pequeña, Mediana, Grande)
- ✨ ¡Y cualquier otro que necesites!

### 2. Controles de UI Flexibles
Cada atributo puede mostrarse de diferentes formas:
- **Dropdown** - Para muchas opciones
- **Botones** - Visual, ideal para pocas opciones
- **Selector de Color** - Para variantes de color
- **Texto Libre** - Para personalizaciones
- **Número** - Para valores numéricos

### 3. Generación Automática de Variantes
Define los atributos y sus valores, el sistema genera automáticamente todas las combinaciones posibles.

Ejemplo:
- 3 tamaños × 3 sabores = 9 variantes generadas automáticamente

### 4. SKU Automático
Se genera automáticamente un SKU único para cada variante:
```
PRD00001-500-POL-1
PRD00001-1KG-RES-1
```

### 5. Stock por Variante
Cada variante tiene su propio control de inventario independiente.

### 6. Imágenes por Variante
Opcionalmente, cada variante puede tener su propia imagen.

## 🛠️ Próximos Pasos

1. ✅ Ejecutar el script SQL
2. ✅ Verificar que se crearon las tablas
3. ✅ Probar creando un tipo de atributo personalizado
4. ✅ Crear un producto simple de prueba
5. ✅ Crear un producto con variantes de prueba
6. ✅ Verificar que los productos existentes siguen funcionando

## 🐛 Troubleshooting

### Error: "column 'product_type' already exists"
- **Solución**: Ya ejecutaste el script antes. Es seguro ignorar este error.

### Error: "relation 'attribute_types' already exists"
- **Solución**: Las tablas ya existen. El script usa `CREATE TABLE IF NOT EXISTS` para evitar duplicados.

### No veo el badge de tipo en el listado
- **Solución**: Actualiza la página. Asegúrate de que el import de `Badge` esté correcto.

### Los productos existentes no aparecen como "variable"
- **Solución**: Ejecuta la sección de migración del script SQL nuevamente.

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs de Supabase
2. Verifica que todas las tablas se crearon correctamente
3. Revisa la consola del navegador para errores
4. Contacta al equipo de desarrollo

## 🎉 ¡Listo!

Tu sistema ahora soporta productos simples y productos con variantes de forma flexible y escalable.

---

**Versión**: 1.0.0  
**Fecha**: 21 de Noviembre, 2025  
**Autor**: Pet Gourmet Development Team
