# 🎂 Guía: Cómo Crear Productos con Variantes Personalizadas

## Ejemplo Real: Pasteles de Cumpleaños

### Caso de Uso
Tienes **"Pastel de cumpleaños"** en diferentes presentaciones:
- Pastel Clásico (Pollo, Carne, Pollo Verduras)
- Pastel Fiesta (Carne, Ternera, Pollo Verduras)
- Pastel Amore Mio (Pollo Verduras, Carne, Pollo)

Cada variante tiene:
- ✅ Nombre único
- ✅ Imagen única
- ✅ Precio específico (pueden variar)
- ✅ Stock independiente

---

## 📝 Paso a Paso

### 1️⃣ Crear el Producto Padre

**Ir a:** `/admin/products/new`

1. **Tipo de Producto**: Selecciona **"Producto con Variantes"**
2. **Información Básica**:
   - **Nombre**: "Pastel de cumpleaños Clásico"
   - **Descripción**: "Delicioso pastel para celebrar el cumpleaños de tu mascota"
   - **Categoría**: Para Celebrar
   - **Imagen Principal**: Puedes usar una imagen genérica o la del primer pastel

3. **NO establezcas precio ni stock aquí** - eso irá en cada variante

---

### 2️⃣ Definir el Atributo

**Ir a:** Pestaña **"Variantes"**

#### Opción A: Atributo Simple (Ingrediente/Tipo)

```
Nombre del Atributo: Ingrediente
Valores: Pollo, Carne, Pollo Verduras
```

Esto generará 3 variantes base que luego personalizarás.

#### Opción B: Sin Atributos Predefinidos (Manual)

Si prefieres crear cada variante manualmente sin atributos, simplemente haz clic en **"Añadir Variante Manualmente"** y salta al paso 3.

---

### 3️⃣ Generar Variantes

Haz clic en **"Generar Automáticamente"** (o añade manualmente)

Se crearán 3 variantes base:
- Pollo
- Carne  
- Pollo Verduras

---

### 4️⃣ Personalizar Cada Variante

Para **cada variante**, completa:

#### **Variante 1: Pollo**
```
✏️ Nombre: Pastel de cumpleaños Clásico Pollo
📸 Imagen: [Sube la imagen específica del pastel de pollo]
💰 Precio: $299.00
📦 Stock: 15
✅ Activa: Sí
```

#### **Variante 2: Carne**
```
✏️ Nombre: Pastel de cumpleaños Clásico Carne
📸 Imagen: [Sube la imagen específica del pastel de carne]
💰 Precio: $349.00
📦 Stock: 10
✅ Activa: Sí
```

#### **Variante 3: Pollo Verduras**
```
✏️ Nombre: Pastel de cumpleaños Clásico Pollo Verduras
📸 Imagen: [Sube la imagen específica del pastel de pollo verduras]
💰 Precio: $329.00
📦 Stock: 12
✅ Activa: Sí
```

---

### 5️⃣ Guardar

Haz clic en **"Guardar Producto"**

---

## 🎨 Para las Otras Líneas de Pasteles

### Pastel Fiesta

1. **Crear nuevo producto**: "Pastel de cumpleaños Fiesta"
2. **Tipo**: Producto con Variantes
3. **Atributo**: Ingrediente → Carne, Ternera, Pollo Verduras
4. **Personalizar cada variante**:
   - Pastel Fiesta Carne (imagen + precio + stock)
   - Pastel Fiesta Ternera (imagen + precio + stock)
   - Pastel Fiesta Pollo Verduras (imagen + precio + stock)

### Pastel Amore Mio

1. **Crear nuevo producto**: "Pastel de cumpleaños Amore Mio"
2. **Tipo**: Producto con Variantes
3. **Atributo**: Ingrediente → Pollo Verduras, Carne, Pollo
4. **Personalizar cada variante**:
   - Pastel Amore Mio Pollo Verduras (imagen + precio + stock)
   - Pastel Amore Mio Carne (imagen + precio + stock)
   - Pastel Amore Mio Pollo (imagen + precio + stock)

---

## 🛍️ Cómo se Ve en la Tienda

### Página de Producto

```
┌─────────────────────────────────────────┐
│  Pastel de cumpleaños Clásico          │
├─────────────────────────────────────────┤
│  [Imagen del producto]                  │
│                                         │
│  Selecciona el ingrediente:             │
│  ○ Pollo        - $299.00              │
│  ○ Carne        - $349.00              │
│  ○ Pollo Verduras - $329.00            │
│                                         │
│  [Imagen actualizada según selección]   │
│                                         │
│  Cantidad: [- 1 +]                      │
│  [Añadir al carrito - $299.00]         │
└─────────────────────────────────────────┘
```

Cuando el cliente selecciona una opción:
- ✅ La **imagen cambia** a la de esa variante
- ✅ El **precio se actualiza**
- ✅ El **stock se verifica** (si no hay, aparece "Agotado")
- ✅ El **nombre completo** se muestra

---

## 💡 Consejos y Mejores Prácticas

### 1. Nombres Descriptivos
✅ Bueno: "Pastel Clásico Pollo"
❌ Malo: "Pollo" (muy genérico)

### 2. Imágenes de Calidad
- Usa imágenes de alta resolución
- Muestra claramente el producto
- Mantén un estilo visual consistente

### 3. Precios Coherentes
Si todas las variantes cuestan lo mismo, ponles el mismo precio.
Si varían por ingredientes premium (ej: Ternera), ajusta el precio.

### 4. SKUs Opcionales pero Útiles
Usa SKUs para control de inventario:
```
PAST-CLAS-POL
PAST-CLAS-CAR
PAST-CLAS-POLVER
PAST-FIES-CAR
PAST-AMOR-POL
```

### 5. Stock Realista
Actualiza el stock regularmente para evitar sobreventa.

---

## 🚀 Ventajas de Este Sistema

### Para Ti (Admin)
✅ Todo organizado bajo un producto
✅ Fácil gestión de múltiples variantes
✅ Stock independiente por variante
✅ Análisis de ventas por variante

### Para el Cliente
✅ Experiencia de compra clara
✅ Ve todas las opciones en un solo lugar
✅ Imágenes específicas por opción
✅ Precios transparentes
✅ Selector visual intuitivo

---

## 🔄 Flujo Completo del Cliente

1. **Navega** por la categoría "Para Celebrar"
2. **Ve** la tarjeta de "Pastel de cumpleaños Clásico"
3. **Hace clic** para ver detalles
4. **Selecciona** el ingrediente que prefiere (Pollo, Carne, etc.)
5. **Ve la imagen** específica de esa opción
6. **Confirma** precio y disponibilidad
7. **Añade** al carrito la variante específica
8. **Procede** al checkout

En el carrito verá:
```
🛒 Tu Carrito
- Pastel de cumpleaños Clásico Pollo × 1 - $299.00
- Pastel de cumpleaños Fiesta Carne × 2 - $698.00
```

---

## ❓ Preguntas Frecuentes

### ¿Puedo tener variantes con diferentes atributos?
**Sí**. Ejemplo:
- Atributo 1: Ingrediente (Pollo, Carne)
- Atributo 2: Tamaño (Pequeño, Grande)

Esto generaría 4 variantes:
- Pollo Pequeño
- Pollo Grande
- Carne Pequeño
- Carne Grande

### ¿Puedo desactivar una variante temporalmente?
**Sí**. Desmarca "Variante activa" y no se mostrará en la tienda, pero mantendrás los datos.

### ¿Qué pasa si una variante se agota?
El sistema mostrará "Agotado" automáticamente y no permitirá añadirla al carrito.

### ¿Puedo cambiar el orden de las variantes?
Sí, usa el campo `display_order` o reordénalas arrastrando (función futura).

---

## 📞 ¿Necesitas Ayuda?

Contacta al equipo de desarrollo o consulta el `SISTEMA-VARIANTES-README.md` para más detalles técnicos.

---

**¡Feliz venta de pasteles! 🎂🐕**
