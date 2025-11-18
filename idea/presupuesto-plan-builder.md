# Presupuesto: Plan Builder para Petgourmet

## Análisis del Sistema FreshPet

Basado en el flujo de freshpet.com/planBuilder, se requiere desarrollar un sistema completo de creación de planes personalizados de comida para mascotas.

## Funcionalidades Principales

### 1. Formulario Multi-Paso (Wizard)
**Paso 1: Información de la Mascota**
- Nombre de la mascota
- Género (Male/Female)
- Peso (con conversión kg/lbs)
- Nivel de actividad (Mellow, Active, Athlete)
- Condición corporal (Underweight, Ideal weight, Overweight)
- Sensibilidades alimentarias (Sí/No)
- Objetivos de salud (múltiple selección)

**Paso 2: Tipo de Plan**
- Full Plan (100% FreshPet)
- Half Plan (50% mezcla con comida actual)
- Cálculo automático de calorías diarias
- Información sobre "solo quiero probar por unos días"

**Paso 3: Selección de Recetas**
- Lista de recetas recomendadas
- Sistema de selección/deselección
- Información nutricional por receta
- Indicador de porciones por bolsa

**Paso 4: Plan de Comidas**
- Vista del plan recomendado vs plan personalizado
- Ajuste de cantidad de bolsas (+/-)
- Selector de frecuencia de envío
- Sección de extras/treats
- Resumen de precios y descuentos
- Opción "Add Another Dog"

**Paso 5: Inside Your Delivery**
- Información sobre las recetas
- Guías de alimentación personalizadas
- Información de empaque ecológico

**Paso 6: Checkout**
- Integración con stripe
- Formulario de contacto y entrega
- Aplicación de código de descuento
- Resumen de suscripción
- Información de auto-renovación

### 2. Calculadora de Nutrición
- Algoritmo de cálculo de calorías basado en:
  - Peso de la mascota
  - Nivel de actividad
  - Condición corporal
  - Objetivos de salud
- Recomendación de porciones por día
- División en plan completo o medio plan

### 3. Sistema de Recomendaciones
- Motor de recomendación de recetas
- Filtrado basado en sensibilidades
- Priorización según objetivos de salud

### 4. Gestión de Suscripciones
- Creación de suscripción recurrente
- Cálculo de precios con descuentos
- Sistema de frecuencia personalizable
- Pausa/cancelación sin compromiso

### 5. Multi-Pet Support
- Capacidad de agregar múltiples mascotas
- Cálculo independiente por mascota
- Combinación en un solo pedido

## Desglose de Horas por Módulo

| Módulo | Horas | Descripción |
|--------|-------|-------------|
| **Frontend Development** | **28** | |
| Diseño UI/UX | 4 | Diseño de 6 pasos del wizard, componentes |
| Formulario Multi-Paso | 12 | Wizard completo con navegación y validaciones |
| Calculadora de Nutrición | 4 | Algoritmo de cálculo de calorías y porciones |
| Sistema Multi-Pet | 3 | CRUD de mascotas y cálculo combinado |
| Animaciones y UX | 2 | Transiciones, loading states |
| Responsive Design | 3 | Adaptación mobile/tablet |
| **Backend Development** | **20** | |
| API Endpoints | 8 | Endpoints de recetas, nutrición, sesiones, suscripciones |
| Base de Datos | 4 | Modelos de recetas, mascotas, planes, suscripciones |
| Lógica de Negocio | 5 | Motor de recomendaciones, precios, descuentos |
| Integraciones | 3 | Stripe, sistema de envío, emails |
| **Testing y QA** | 8 | |
| Unit tests | 3 | Tests de componentes y API |
| Integration tests | 2 | Tests de flujo completo |
| Testing manual/QA | 3 | Pruebas manuales exhaustivas |
| **DevOps y Deploy** | 2 | |
| Deploy y configuración | 2 | CI/CD, variables, monitoring |
| **Documentación** | 2 | |
| Documentación técnica | 2 | API docs, guías de uso |
| **TOTAL** | **60** | |

## Presupuesto

| Concepto | Cantidad | Valor Unitario | Total |
|----------|----------|----------------|-------|
| Horas de Desarrollo | 60 | $20.000 COP | **$1.200.000 COP** |

## Cronograma de Desarrollo

| Fase | Duración | Horas | Entregables |
|------|----------|-------|-------------|
| **Fase 1: MVP** | 2 semanas | 24 | Formulario 3 pasos, calculadora nutrición, checkout básico |
| **Fase 2: Completo** | 2 semanas | 24 | 6 pasos completos, multi-pet, recomendaciones, integración pagos |
| **Fase 3: QA y Deploy** | 1 semana | 12 | Testing, optimización, documentación, deploy |
| **TOTAL** | **5 semanas** | **60** | Sistema completo funcionando |

## Tecnologías

### Frontend
- **Next.js 14** (App Router)
- **React Hook Form** + **Zod** (validación)
- **Zustand** (estado del wizard)
- **Framer Motion** (animaciones)
- **Tailwind CSS** (estilos)
- **shadcn/ui** (componentes)

### Backend
- **Next.js API Routes**
- **Supabase/PostgreSQL** (ya implementado)
- **Stripe** (pagos)

### Testing
- **Jest** + **React Testing Library**
- **Playwright** (E2E)

## Riesgos y Consideraciones

### Riesgos Técnicos
- Complejidad del algoritmo de recomendaciones
- Sincronización entre pasos del wizard
- Manejo de estado complejo multi-pet

### Riesgos de Negocio
- Integración con proveedor de pagos
- Logística de envío de productos frescos
- Cumplimiento normativo (alimentos para mascotas)

### Mitigaciones
- Desarrollo iterativo con validación constante
- Pruebas exhaustivas de flujo de pago
- Consulta con expertos en nutrición animal

## Recomendaciones

1. **Comenzar con MVP**: Implementar flujo básico y validar con usuarios
2. **Componentes reutilizables**: Crear biblioteca de componentes desde el inicio
3. **Testing continuo**: Implementar tests desde el principio
4. **Monitoreo**: Configurar analytics para entender comportamiento del usuario

## Conclusión

Este proyecto es factible en **5 semanas** de desarrollo. La inversión total es de **$1.200.000 COP** (60 horas a $20.000 COP/hora).

**Inversión total:** $1.200.000 COP para implementación completa.
