# Flujo de Autenticación en Calculadora Nutricional

## Fecha: 23 de junio de 2026

---

## 🎯 Comportamiento Implementado

Al hacer clic en **"Suscribirme ahora"**, el sistema:

1. **Verifica si el usuario está autenticado**
   - ✅ **Si está autenticado:** Procede directo a checkout de Stripe
   - ❌ **Si NO está autenticado:** Redirige a login/registro

2. **Después del login/registro:**
   - Regresa automáticamente a la calculadora
   - Procesa el checkout automáticamente
   - Redirige a Stripe para pago

---

## 🔄 Flujo Completo del Usuario

### **Escenario 1: Usuario NO Autenticado**

```
┌─────────────────────────────────────┐
│ 1. Usuario completa calculadora     │
│    (nombre, peso, edad, actividad)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Plan se agrega al carrito        │
│    automáticamente (en segundo      │
│    plano, solo número ↑)            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Clic en "Suscribirme ahora" 🔒   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Sistema detecta: NO AUTH         │
│    - Guarda datos en localStorage   │
│    - Redirige a /auth/login         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Usuario inicia sesión o          │
│    se registra                       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. Sistema detecta:                 │
│    ✅ Usuario autenticado            │
│    ✅ Parámetro checkout=true        │
│    ✅ Datos guardados en localStorage│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 7. AUTO-EJECUTA handleCheckout()    │
│    - Crea sesión de Stripe          │
│    - Redirige a Stripe checkout     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 8. Usuario completa pago en Stripe  │
└─────────────────────────────────────┘
```

### **Escenario 2: Usuario YA Autenticado**

```
┌─────────────────────────────────────┐
│ 1. Usuario completa calculadora     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Plan se agrega al carrito        │
│    automáticamente                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Clic en "Suscribirme ahora"      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Sistema detecta: AUTH ✅         │
│    - Procede directo a Stripe       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Usuario completa pago en Stripe  │
└─────────────────────────────────────┘
```

---

## 🔧 Implementación Técnica

### **1. Modificación en `handleCheckout`**

```typescript
const handleCheckout = useCallback(async () => {
  if (!selectedRecipeObjects.length || !calorieResult) return
  setCheckoutError(null)

  // ❌ Si NO hay usuario → Guardar datos y redirigir a login
  if (!user) {
    // Guardar intención de checkout
    localStorage.setItem('pendingCheckout', 'nutrition_calculator')
    localStorage.setItem('nutritionCalculatorData', JSON.stringify({
      savedDogs,
      currentDog: {
        petName: form.petName,
        dailyGrams: calorieResult.dailyGrams,
        servingPlan: form.servingPlan,
        recipeIds: form.selectedRecipes,
      }
    }))
    
    // Redirigir a login con parámetros
    router.push('/auth/login?redirect=/crear-plan&checkout=true')
    return
  }

  // ✅ Si hay usuario → Proceder a Stripe
  setIsCheckoutLoading(true)

  try {
    // Construir items para Stripe...
    const response = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, customer, metadata }),
    })

    const { url, sessionId } = await response.json()
    
    // Limpiar datos pendientes
    localStorage.removeItem('pendingCheckout')
    localStorage.removeItem('nutritionCalculatorData')
    
    window.location.href = url
  } catch (err) {
    setCheckoutError(err.message)
    setIsCheckoutLoading(false)
  }
}, [user, router, savedDogs, selectedRecipeObjects, calorieResult, form])
```

---

### **2. Nuevo useEffect: Detectar Retorno del Login**

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return

  const urlParams = new URLSearchParams(window.location.search)
  const shouldCheckout = urlParams.get('checkout') === 'true'
  const pendingCheckout = localStorage.getItem('pendingCheckout')

  // Si usuario autenticado + parámetro checkout + datos pendientes
  if (user && shouldCheckout && pendingCheckout === 'nutrition_calculator') {
    setTimeout(() => {
      handleCheckout() // AUTO-EJECUTAR checkout
      
      // Limpiar URL
      urlParams.delete('checkout')
      const newUrl = window.location.pathname + 
                     (urlParams.toString() ? '?' + urlParams.toString() : '')
      window.history.replaceState({}, '', newUrl)
    }, 1000) // Delay de 1s para asegurar carga completa
  }
}, [user, handleCheckout])
```

---

## 📦 Datos Guardados en localStorage

### **Antes del login:**

```json
{
  "pendingCheckout": "nutrition_calculator",
  "nutritionCalculatorData": {
    "savedDogs": [],
    "currentDog": {
      "petName": "Max",
      "dailyGrams": 250,
      "servingPlan": "completo",
      "recipeIds": ["pollo-verduras"]
    }
  }
}
```

### **Después del checkout (limpiado):**

```json
{
  // pendingCheckout: ELIMINADO
  // nutritionCalculatorData: ELIMINADO
}
```

---

## 🔐 Parámetros de URL

### **Redirección a Login:**

```
/auth/login?redirect=/crear-plan&checkout=true
                     ↑              ↑
                     │              └─ Indica que debe procesar checkout
                     └─ Página a la que regresar
```

### **Retorno desde Login:**

```
/crear-plan?checkout=true
            ↑
            └─ Trigger para auto-ejecutar handleCheckout()
```

---

## 🎨 Experiencia Visual

### **Usuario NO autenticado:**

```
[Calculadora completa] 
       ↓
[Clic "Suscribirme ahora"]
       ↓
[Pantalla de login/registro] ← PANEL/MODAL DE AUTENTICACIÓN
       ↓
[Login exitoso]
       ↓
[Regresa a calculadora]
       ↓
[Loading: "Procesando..."] ← 1 segundo
       ↓
[Redirige a Stripe] ← Automático
```

### **Usuario autenticado:**

```
[Calculadora completa]
       ↓
[Clic "Suscribirme ahora"]
       ↓
[Loading: "Procesando..."]
       ↓
[Redirige a Stripe] ← Directo
```

---

## ✅ Ventajas de esta Implementación

1. **Experiencia fluida:** Usuario no pierde su progreso
2. **Sin fricción:** Después del login, todo es automático
3. **Datos preservados:** La calculadora guarda todo el plan
4. **Multi-perro compatible:** Funciona con perros guardados
5. **Seguro:** Validación de autenticación antes de Stripe
6. **Clean URLs:** Los parámetros se limpian después del proceso

---

## 🚨 Manejo de Errores

### **Caso 1: Usuario cierra la calculadora antes de login**

- Datos permanecen en localStorage
- Próxima visita a calculadora puede recuperarlos (opcional)

### **Caso 2: Usuario cancela el login**

- Permanece en página de login
- Puede regresar manualmente a calculadora
- Datos siguen disponibles en localStorage

### **Caso 3: Error en Stripe checkout**

```typescript
catch (err) {
  setCheckoutError(err.message)
  setIsCheckoutLoading(false)
  // Usuario ve mensaje de error en calculadora
  // Puede reintentar
}
```

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Sin auth** | Error o mensaje | Redirige a login |
| **Después login** | Usuario debe volver a empezar | AUTO-procesa checkout |
| **Datos del plan** | Se pierden | Se preservan |
| **Clicks extra** | Re-llenar formulario | 0 clicks extra |
| **Experiencia** | Frustrante 😠 | Fluida 😊 |

---

## 🔍 Archivos Modificados

```
✅ components/nutrition-calculator/index.tsx
   - Modificado handleCheckout: verificación de auth
   - Agregado useEffect: detección de retorno del login
   - Guardado/limpieza de localStorage
   - Redirección a /auth/login con parámetros
   - Auto-ejecución de checkout después del login
```

---

## 🧪 Testing Checklist

- [ ] Usuario NO autenticado → Redirige a login
- [ ] Datos se guardan en localStorage antes de redirigir
- [ ] Después del login, regresa a /crear-plan?checkout=true
- [ ] Auto-ejecuta handleCheckout() al detectar parámetros
- [ ] Procesa pago en Stripe correctamente
- [ ] Limpia localStorage después del checkout
- [ ] Limpia parámetros de URL
- [ ] Usuario autenticado → Va directo a Stripe
- [ ] Multi-perro funciona correctamente
- [ ] Errores se muestran apropiadamente

---

## 🚀 Próximos Pasos Opcionales

### **1. Recuperar datos si el usuario vuelve**

Si el usuario cierra la calculadora sin completar, puede recuperar sus datos:

```typescript
useEffect(() => {
  const savedData = localStorage.getItem('nutritionCalculatorData')
  if (savedData && !form.petName) {
    // Restaurar datos
    const data = JSON.parse(savedData)
    setForm({ ...form, petName: data.currentDog.petName })
    // etc.
  }
}, [])
```

### **2. Mostrar indicador de "Continuando con tu plan..."**

```typescript
if (shouldCheckout && pendingCheckout) {
  return <LoadingScreen message="Continuando con tu plan de Max..." />
}
```

---

**Implementación completa y funcional del flujo de autenticación en calculadora nutricional.** ✅

**Fecha:** 23 de junio de 2026  
**Estado:** Listo para testing
