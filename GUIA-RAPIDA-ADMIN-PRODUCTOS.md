# Guía Rápida: Administrar Productos con Variantes

## 📋 Índice
1. [Producto Simple vs Variable](#producto-simple-vs-variable)
2. [Crear Producto Simple](#crear-producto-simple)
3. [Crear Producto Variable](#crear-producto-variable)
4. [Ejemplo Práctico: Pasteles](#ejemplo-práctico-pasteles)

---

## Producto Simple vs Variable

### ✅ Producto Simple
**Usa cuando:** El producto tiene **un solo precio, stock e imagen**.

**Ejemplos:**
- Collar para perro (talla única)
- Shampoo para mascotas (presentación única)
- Juguete específico

**Campos a completar:**
- Nombre, descripción, categoría
- **1 precio**
- **1 stock**
- **1 imagen principal**
- Imágenes adicionales (opcional)

---

### 🎨 Producto Variable
**Usa cuando:** El producto tiene **múltiples presentaciones** con diferentes precios, stock o imágenes.

**Ejemplos:**
- Pastel en diferentes sabores (Pollo, Carne, Verduras)
- Croquetas en diferentes tamaños (1kg, 5kg, 10kg)
- Ropa para mascotas en diferentes colores

**Campos a completar:**
- Nombre del producto padre (ej: "Pastel Clásico")
- Descripción general
- Categoría
- **Número de variantes** (1-20)
- **Para cada variante:**
  - Nombre específico (ej: "Sabor Pollo")
  - Precio individual
  - Stock individual
  - Imagen individual
  - SKU (opcional)
  - Atributos como sabor, tamaño, color (opcional)

---

## Crear Producto Simple

### Paso 1: Información Básica
1. Ve a `/admin/products/new`
2. Selecciona **"Producto Simple"**
3. Completa:
   - Nombre del producto
   - Descripción
   - Categoría
   - Precio
   - Stock
   - Marca como "Destacado" si aplica

### Paso 2: Imágenes
1. Sube la **imagen principal**
2. Opcionalmente, agrega **imágenes adicionales**

### Paso 3: Guardar
1. Haz clic en **"Guardar Producto"**
2. ¡Listo! El producto ya está visible en la tienda

---

## Crear Producto Variable

### Paso 1: Información Básica
1. Ve a `/admin/products/new`
2. Selecciona **"Producto Variable"**
3. Completa:
   - **Nombre del producto padre** (ej: "Pastel Clásico")
   - Descripción general que aplique a todas las variantes
   - Categoría

### Paso 2: Configurar Variantes
1. **Define el número de variantes** usando los botones +/-
   - Ejemplo: Si tienes 3 sabores, elige **3**
2. Para **cada variante**:
   - ✍️ **Nombre:** Identifica la variante (ej: "Sabor Pollo")
   - 💰 **Precio:** Precio específico de esta variante
   - 📦 **Stock:** Cantidad disponible de esta variante
   - 📸 **Imagen:** Sube una foto específica
   - 🏷️ **SKU (opcional):** Código de inventario
   - 🎯 **Atributos (opcional):** Sabor, Tamaño, Color, etc.

### Paso 3: Imagen Principal (Opcional)
- Puedes subir una imagen principal del producto
- Esta imagen aparece en listados cuando no hay variante seleccionada

### Paso 4: Guardar
1. Verifica que todas las variantes tengan:
   - ✅ Nombre
   - ✅ Precio
   - ✅ Stock
   - ✅ Imagen
2. Haz clic en **"Guardar Producto"**

---

## Ejemplo Práctico: Pasteles

### Caso: Pasteles con 3 Sabores

**Producto Padre:**
- Nombre: `Pastel Clásico`
- Descripción: `Delicioso pastel horneado especialmente para perros, con ingredientes naturales y sin conservadores.`
- Categoría: `Premiar`
- Tipo: **Variable**
- Número de variantes: **3**

**Variante 1:**
- Nombre: `Sabor Pollo`
- SKU: `PASTEL-POLLO-001`
- Precio: `250.00`
- Stock: `15`
- Imagen: 📸 (foto del pastel de pollo)
- Atributo Sabor: `Pollo`

**Variante 2:**
- Nombre: `Sabor Carne`
- SKU: `PASTEL-CARNE-001`
- Precio: `250.00`
- Stock: `20`
- Imagen: 📸 (foto del pastel de carne)
- Atributo Sabor: `Carne`

**Variante 3:**
- Nombre: `Pollo con Verduras`
- SKU: `PASTEL-PVERD-001`
- Precio: `280.00`
- Stock: `10`
- Imagen: 📸 (foto del pastel de pollo con verduras)
- Atributo Sabor: `Pollo y Verduras`

### Resultado en la Tienda:
```
🎂 Pastel Clásico
   Desde $250.00

   Sabores disponibles:
   • Sabor Pollo - $250.00
   • Sabor Carne - $250.00  
   • Pollo con Verduras - $280.00
```

---

## 💡 Consejos

### Para Productos Simples:
- ✅ Usa descripciones claras y detalladas
- ✅ Sube imágenes de alta calidad (recomendado 800x800px)
- ✅ Marca como "Destacado" los productos más vendidos

### Para Productos Variables:
- ✅ **Nombres descriptivos:** "Sabor Pollo" es mejor que "Variante 1"
- ✅ **Imágenes únicas:** Cada variante debe tener su propia foto
- ✅ **Precios precisos:** Verifica el precio de cada variante
- ✅ **Stock actualizado:** Mantén el inventario al día por variante
- ✅ **Usa atributos:** Facilita búsquedas y filtros (Sabor, Tamaño, Color)

### Gestión de Atributos:
1. Ve a `/admin/attribute-types` para crear atributos reutilizables
2. Ejemplos de atributos útiles:
   - **Sabor:** Pollo, Carne, Pescado, Verduras
   - **Tamaño:** XS, S, M, L, XL
   - **Color:** Rojo, Azul, Verde, Rosa
   - **Peso:** 1kg, 5kg, 10kg

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo cambiar un producto simple a variable?**  
R: Sí, edita el producto y cambia el tipo. Necesitarás configurar las variantes.

**P: ¿Cuántas variantes puedo crear?**  
R: Máximo 20 variantes por producto.

**P: ¿Qué pasa con el precio y stock del producto padre?**  
R: En productos variables, el precio y stock se manejan por variante.

**P: ¿Puedo tener diferentes precios por variante?**  
R: ¡Sí! Cada variante tiene su propio precio, stock e imagen.

**P: ¿Las variantes se muestran en la tienda?**  
R: Sí, los clientes pueden seleccionar entre las variantes disponibles al agregar al carrito.

---

## 🚀 Flujo Completo

```
1. Crear Producto
   ├─ Tipo Simple
   │  ├─ Info básica → Imagen → Guardar
   │  └─ ✅ Producto listo
   │
   └─ Tipo Variable
      ├─ Info básica → Número de variantes
      ├─ Completar datos de cada variante
      │  ├─ Variante 1 (nombre, precio, stock, imagen)
      │  ├─ Variante 2 (nombre, precio, stock, imagen)
      │  └─ Variante N...
      └─ Guardar → ✅ Producto con variantes listo
```

---

## 📞 Soporte

¿Necesitas ayuda? Revisa:
- `SISTEMA-VARIANTES-README.md` - Documentación técnica completa
- `GUIA-VARIANTES-PASTELES.md` - Tutorial detallado con ejemplos
