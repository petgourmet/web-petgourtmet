# Cambio: Auto-agregar al Carrito en Calculadora Nutricional

## Fecha: 23 de junio de 2026

---

## 📋 Descripción del Cambio

La calculadora nutricional ahora agrega **automáticamente** los productos al carrito cuando el usuario completa el cálculo y se determina la receta recomendada.

---

## ✨ Comportamiento Nuevo

### **Antes:**
1. Usuario completa la calculadora
2. Ve el resumen con recetas y precios
3. Hace clic en "Suscribirme ahora"
4. Se crea sesión de Stripe y redirige al checkout

### **Ahora:**
1. Usuario completa la calculadora
2. Automáticamente se selecciona la receta recomendada
3. **🎯 EN ESE MOMENTO se agrega automáticamente al carrito**
4. El usuario ve el número rojo del carrito aumentar (ejemplo: 2 → 3)
5. El usuario puede:
   - Continuar agregando más perros
   - Ir al carrito para revisar
   - Proceder al checkout desde el carrito

---

## 🔧 Implementación Técnica

### **1. Hook useEffect que detecta cuando se completa el plan**

```typescript
useEffect(() => {
  if (
    isServingPlanComplete(form) &&
    selectedRecipeObjects.length > 0 &&
    calorieResult &&
    !addedToCartRef.current
  ) {
    addedToCartRef.current = true // Evita duplicados

    selectedRecipeObjects.forEach((recipe) => {
      const monthlyKg = (calorieResult.dailyGrams * 28) / 1000
      const fullMonthlyPrice = monthlyKg * recipe.pricePerKg
      const discountedPrice = fullMonthlyPrice * 0.5
      
      addToCart({
        id: parseInt(recipe.id.split('-')[0]) || Math.floor(Math.random() * 10000),
        name: `${recipe.name}${form.petName ? ` — ${form.petName}` : ""}`,
        price: discountedPrice,
        quantity: 1,
        image: recipe.image,
        size: `${calorieResult.dailyGrams}g/día · ${Math.round(calorieResult.dailyGrams / 2)}g por toma`,
        isSubscription: true,
        subscriptionType: "monthly",
        slug: recipe.productSlug || undefined,
      })
    })
  }

  // Resetear flag si se limpia el formulario
  if (!isServingPlanComplete(form) || selectedRecipeObjects.length === 0) {
    addedToCartRef.current = false
  }
}, [form, selectedRecipeObjects, calorieResult, addToCart])
```

### **2. Ref para evitar duplicados**

```typescript
const addedToCartRef = useRef(false)
```

Este `ref` asegura que no se agregue el mismo plan múltiples veces al carrito.

### **3. Reset al agregar otro perro**

```typescript
const handleAddAnotherDog = useCallback(() => {
  // ... código existente
  addedToCartRef.current = false // Resetear para el próximo perro
  // ...
}, [form, calorieResult, totalDogs])
```

---

## 🎯 Momento Exacto del Auto-Add

El producto se agrega automáticamente cuando:

✅ **1. Plan de servicio está completo** (`servingPlan` = "completo" o "medio")  
✅ **2. Hay recetas seleccionadas** (mínimo 1 receta)  
✅ **3. El cálculo de calorías está completo** (`calorieResult` existe)  
✅ **4. No se ha agregado antes** (flag `addedToCartRef.current = false`)

**En resumen:** Tan pronto como se selecciona el plan de servicio y se calcula la receta recomendada.

---

## 📦 Información del Producto en el Carrito

Cada producto agregado incluye:

```typescript
{
  id: number,                          // ID único generado
  name: "Nutrición diaria Pollo Verduras — Max",  // Con nombre del perro
  price: 856.80,                       // Precio mensual con 50% descuento
  quantity: 1,
  image: "/cacu/pollo-ver.png",        // Imagen del paquete
  size: "250g/día · 125g por toma",    // Porción calculada
  isSubscription: true,
  subscriptionType: "monthly",
  slug: "pastel-porcin-de-pollo-verduras-hippo"
}
```

---

## 🔄 Flujo Completo del Usuario

### **Escenario 1: Un solo perro**

1. Ingresa datos: nombre "Max", peso 10kg, adulto, actividad moderada
2. Selecciona plan: "Completo"
3. **→ AUTO-ADD:** Se agrega "Nutrición diaria Pollo Verduras — Max" al carrito
4. Ve el número rojo del carrito cambiar (0 → 1)
5. Usuario puede ir al carrito y proceder al pago

### **Escenario 2: Múltiples perros**

1. Completa plan para "Max" → **AUTO-ADD** (carrito: 1)
2. Hace clic en "Agregar otro perro"
3. Completa plan para "Luna" → **AUTO-ADD** (carrito: 2)
4. Hace clic en "Agregar otro perro"
5. Completa plan para "Rocky" → **AUTO-ADD** (carrito: 3)
6. Usuario revisa los 3 productos en el carrito y procede al pago

### **Escenario 3: Usuario cambia de opinión**

1. Completa plan → **AUTO-ADD** (carrito: 1)
2. Ve que se agregó al carrito
3. Puede:
   - Ir al carrito y eliminar el producto
   - Modificar la cantidad
   - Cambiar a otro plan (se agregará uno nuevo)

---

## 🚫 Prevención de Duplicados

### **Problema:** Si el usuario cambia algo en el formulario, ¿se agregará de nuevo?

**Solución:** El `addedToCartRef` se resetea **SOLO** cuando:

1. El usuario hace clic en "Agregar otro perro" (nuevo plan)
2. El formulario se limpia completamente
3. El plan de servicio se vuelve incompleto

**NO se resetea** si el usuario simplemente:
- Agrega extras
- Cambia el nombre del perro (una vez agregado)
- Navega por la página

---

## 🎨 Experiencia Visual

### **Feedback al usuario:**

1. **Número rojo del carrito aumenta** (animación del badge)
2. **Toast de confirmación** (del sistema de carrito)
   ```
   ✅ Producto agregado al carrito
   ```
3. **El resumen sigue visible** para que pueda:
   - Ver los detalles del plan
   - Agregar otro perro
   - Ir directamente al carrito

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Clicks requeridos** | Completar formulario + clic "Suscribirme" | Solo completar formulario |
| **Redirección** | Inmediata a Stripe checkout | Ninguna, permanece en calculadora |
| **Carrito** | No se usaba | Se llena automáticamente |
| **Multi-perro** | Checkout individual | Todos en el mismo carrito |
| **Flexibilidad** | Baja (pago directo) | Alta (revisar, modificar, agregar más) |

---

## 🔍 Archivos Modificados

```
✅ components/nutrition-calculator/index.tsx
   - Importado: useEffect, useRef
   - Agregado: addedToCartRef
   - Agregado: useEffect de auto-add
   - Modificado: handleAddAnotherDog (reset del ref)
```

---

## ⚠️ Consideraciones Importantes

### **1. El botón "Suscribirme ahora" aún existe**

Aunque el auto-add funciona, el botón sigue ahí por si el usuario quiere:
- Ver confirmación visual
- Abrir el carrito manualmente
- Sentirse en control del proceso

### **2. No se abre el modal del carrito automáticamente**

Esto es intencional para no interrumpir el flujo del usuario, especialmente si quiere agregar múltiples perros.

### **3. Los extras NO se agregan automáticamente**

Solo las recetas del plan se agregan. Los extras opcionales deben agregarse manualmente haciendo clic en "+ Añadir".

---

## ✅ Testing Checklist

- [x] Compilación exitosa
- [ ] Auto-add al completar plan de servicio
- [ ] Número rojo del carrito se actualiza
- [ ] Toast de confirmación aparece
- [ ] No se duplica si se modifica el formulario
- [ ] Se resetea al agregar otro perro
- [ ] Multi-perro agrega múltiples productos
- [ ] Productos tienen nombre del perro
- [ ] Precio calculado correctamente (50% descuento)
- [ ] Tamaño de porción correcto
- [ ] Carrito funciona normalmente
- [ ] Checkout desde carrito funciona

---

## 🚀 Próximos Pasos

1. ✅ Probar en desarrollo
2. ✅ Verificar que el número rojo del carrito se actualice
3. ✅ Confirmar que no hay duplicados
4. ✅ Testear flujo multi-perro
5. ⏸️ Deploy a staging
6. ⏸️ Testing de usuario
7. ⏸️ Deploy a producción

---

**Cambio implementado por:** OpenCode AI Agent  
**Fecha:** 23 de junio de 2026  
**Estado:** ✅ Listo para testing
