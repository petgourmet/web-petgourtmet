# Análisis y Recomendaciones: Validación de Precios Carrito vs MercadoPago

## 1. Estado Actual del Sistema

### 1.1 Análisis de la Implementación Existente

Actualmente, el sistema **NO cuenta con validación de precios** entre el carrito de compras local y los montos enviados a MercadoPago. Los puntos críticos identificados son:

**Frontend (Carrito Local):**
- Cálculo de totales en `cart-context.tsx` usando `calculateCartTotal()`
- Aplicación de descuentos del 10% para suscripciones
- Cálculo de envío gratuito para compras ≥ $1000 MXN

**Backend (API de MercadoPago):**
- Creación de preferencias en `/api/mercadopago/create-preference/route.ts`
- Procesamiento de webhooks sin validación de montos
- Validación de pagos que solo verifica estados, no importes

### 1.2 Flujo Actual de Precios

```mermaid
graph TD
    A[Carrito Frontend] --> B[calculateCartTotal()]
    B --> C[Checkout Modal]
    C --> D[API create-preference]
    D --> E[MercadoPago]
    E --> F[Webhook]
    F --> G[Base de Datos]
    
    style A fill:#ffcccc
    style G fill:#ffcccc
    
    H["❌ Sin validación de precios"] --> A
    I["❌ Sin comparación de montos"] --> G
```

## 2. Riesgos Identificados

### 2.1 Riesgos de Seguridad

| Riesgo | Impacto | Probabilidad | Descripción |
|--------|---------|--------------|-------------|
| **Manipulación de precios** | Alto | Medio | Usuario modifica precios en frontend antes del checkout |
| **Discrepancias de cálculo** | Alto | Alto | Diferencias entre cálculo frontend/backend |
| **Pagos incorrectos** | Crítico | Bajo | Cliente paga monto diferente al esperado |
| **Pérdidas financieras** | Crítico | Medio | Productos vendidos a precios incorrectos |

### 2.2 Escenarios de Vulnerabilidad

1. **Modificación de JavaScript:** Usuario altera `calculateCartTotal()` en DevTools
2. **Intercepción de requests:** Modificación de payload antes de envío a API
3. **Race conditions:** Cambios de precio durante proceso de checkout
4. **Errores de redondeo:** Diferencias en cálculos de decimales

## 3. Puntos de Validación Recomendados

### 3.1 Validación en Create Preference (Crítico)

**Ubicación:** `/app/api/mercadopago/create-preference/route.ts`

```typescript
// Función de validación de precios
function validateCartPrices(cartItems: any[], calculatedTotal: number): ValidationResult {
  let serverTotal = 0
  
  // Recalcular total en servidor
  cartItems.forEach(item => {
    const basePrice = item.isSubscription ? item.price * 0.9 : item.price
    serverTotal += basePrice * item.quantity
  })
  
  // Agregar envío si aplica
  const shippingCost = serverTotal >= 1000 ? 0 : 100
  serverTotal += shippingCost
  
  // Validar diferencia (tolerancia de 1 peso por redondeo)
  const difference = Math.abs(serverTotal - calculatedTotal)
  
  return {
    isValid: difference <= 1,
    serverTotal,
    clientTotal: calculatedTotal,
    difference,
    shippingCost
  }
}

// Implementación en el endpoint
export async function POST(request: NextRequest) {
  try {
    const { cart, customerInfo, total } = await request.json()
    
    // VALIDACIÓN CRÍTICA DE PRECIOS
    const priceValidation = validateCartPrices(cart, total)
    
    if (!priceValidation.isValid) {
      console.error('❌ Validación de precios falló:', priceValidation)
      return NextResponse.json(
        { 
          error: 'Price validation failed',
          details: priceValidation
        },
        { status: 400 }
      )
    }
    
    // Usar total calculado en servidor (no el del cliente)
    const validatedTotal = priceValidation.serverTotal
    
    // Continuar con creación de preferencia...
  } catch (error) {
    // Manejo de errores
  }
}
```

### 3.2 Validación en Webhook (Importante)

**Ubicación:** `lib/webhook-service.ts` - función `handleOrderPayment`

```typescript
private async handleOrderPayment(paymentData: PaymentData, supabase: any): Promise<boolean> {
  try {
    const orderId = paymentData.external_reference
    const paymentAmount = paymentData.transaction_amount
    
    // Obtener orden de la base de datos
    const { data: order } = await supabase
      .from('orders')
      .select('total, items')
      .eq('id', orderId)
      .single()
    
    if (order) {
      // VALIDACIÓN DE MONTO EN WEBHOOK
      const expectedAmount = parseFloat(order.total)
      const receivedAmount = paymentAmount
      const difference = Math.abs(expectedAmount - receivedAmount)
      
      if (difference > 1) {
        logger.error('❌ Discrepancia de monto en webhook', {
          orderId,
          expectedAmount,
          receivedAmount,
          difference
        })
        
        // Marcar orden como sospechosa
        await supabase
          .from('orders')
          .update({ 
            status: 'price_mismatch',
            notes: `Discrepancia de precio: esperado ${expectedAmount}, recibido ${receivedAmount}`
          })
          .eq('id', orderId)
          
        return false
      }
    }
    
    // Continuar con procesamiento normal...
  } catch (error) {
    // Manejo de errores
  }
}
```

### 3.3 Validación en Validate Payment (Complementario)

**Ubicación:** `/app/api/mercadopago/validate-payment/route.ts`

```typescript
// Agregar validación de monto en la función existente
async function updateLocalPaymentStatus(paymentId: string, mercadoPagoData: MercadoPagoPaymentResponse) {
  const supabase = createClient()
  
  try {
    // Buscar orden
    const { data: orderRecord } = await supabase
      .from('orders')
      .select('*')
      .eq('mercadopago_payment_id', paymentId)
      .single()
    
    if (orderRecord) {
      // VALIDACIÓN DE MONTO
      const expectedAmount = parseFloat(orderRecord.total)
      const actualAmount = mercadoPagoData.transaction_amount
      const difference = Math.abs(expectedAmount - actualAmount)
      
      if (difference > 1) {
        console.warn(`⚠️ Discrepancia de monto en validación: ${difference}`, {
          orderId: orderRecord.id,
          expected: expectedAmount,
          actual: actualAmount
        })
        
        // Registrar discrepancia pero no fallar
        await supabase
          .from('payment_discrepancies')
          .insert({
            order_id: orderRecord.id,
            payment_id: paymentId,
            expected_amount: expectedAmount,
            actual_amount: actualAmount,
            difference: difference,
            created_at: new Date().toISOString()
          })
      }
    }
    
    // Continuar con actualización...
  } catch (error) {
    // Manejo de errores
  }
}
```

## 4. Implementación Técnica Detallada

### 4.1 Nueva Tabla de Discrepancias

```sql
-- Crear tabla para registrar discrepancias de precios
CREATE TABLE payment_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_id VARCHAR(255),
    expected_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    difference DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX idx_payment_discrepancies_order_id ON payment_discrepancies(order_id);
CREATE INDEX idx_payment_discrepancies_status ON payment_discrepancies(status);
CREATE INDEX idx_payment_discrepancies_created_at ON payment_discrepancies(created_at DESC);
```

### 4.2 Servicio de Validación de Precios

```typescript
// lib/price-validation-service.ts
export class PriceValidationService {
  private static readonly TOLERANCE = 1 // 1 peso de tolerancia
  
  static validateCartTotal(cartItems: CartItem[], clientTotal: number): PriceValidationResult {
    const serverCalculation = this.calculateServerTotal(cartItems)
    const difference = Math.abs(serverCalculation.total - clientTotal)
    
    return {
      isValid: difference <= this.TOLERANCE,
      serverTotal: serverCalculation.total,
      clientTotal,
      difference,
      breakdown: serverCalculation.breakdown,
      tolerance: this.TOLERANCE
    }
  }
  
  private static calculateServerTotal(cartItems: CartItem[]): ServerCalculation {
    let subtotal = 0
    const breakdown: PriceBreakdown[] = []
    
    cartItems.forEach(item => {
      const basePrice = item.isSubscription ? item.price * 0.9 : item.price
      const itemTotal = basePrice * item.quantity
      subtotal += itemTotal
      
      breakdown.push({
        itemId: item.id,
        name: item.name,
        basePrice: item.price,
        finalPrice: basePrice,
        quantity: item.quantity,
        total: itemTotal,
        isSubscription: item.isSubscription
      })
    })
    
    const shipping = subtotal >= 1000 ? 0 : 100
    const total = subtotal + shipping
    
    return {
      subtotal,
      shipping,
      total,
      breakdown
    }
  }
}

interface PriceValidationResult {
  isValid: boolean
  serverTotal: number
  clientTotal: number
  difference: number
  breakdown: PriceBreakdown[]
  tolerance: number
}

interface ServerCalculation {
  subtotal: number
  shipping: number
  total: number
  breakdown: PriceBreakdown[]
}

interface PriceBreakdown {
  itemId: string
  name: string
  basePrice: number
  finalPrice: number
  quantity: number
  total: number
  isSubscription: boolean
}
```

### 4.3 Middleware de Validación

```typescript
// middleware/price-validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { PriceValidationService } from '@/lib/price-validation-service'

export function priceValidationMiddleware(request: NextRequest) {
  // Solo aplicar a rutas de checkout
  if (!request.nextUrl.pathname.includes('/api/mercadopago/create-preference')) {
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

// Función helper para validar en endpoints
export async function validateRequestPrices(request: NextRequest): Promise<ValidationResponse> {
  try {
    const body = await request.json()
    const { cart, total } = body
    
    if (!cart || !total) {
      return {
        isValid: false,
        error: 'Missing cart or total in request'
      }
    }
    
    const validation = PriceValidationService.validateCartTotal(cart, total)
    
    return {
      isValid: validation.isValid,
      validation,
      error: validation.isValid ? null : 'Price validation failed'
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to parse request for price validation'
    }
  }
}

interface ValidationResponse {
  isValid: boolean
  validation?: PriceValidationResult
  error?: string
}
```

## 5. Casos de Uso y Escenarios de Prueba

### 5.1 Casos de Prueba Funcionales

| Caso | Descripción | Entrada | Resultado Esperado |
|------|-------------|---------|--------------------|
| **TC001** | Carrito normal válido | Cart: 2 items $500 c/u | ✅ Validación exitosa |
| **TC002** | Carrito con suscripción | Cart: 1 suscripción $1000 | ✅ Descuento 10% aplicado |
| **TC003** | Envío gratuito | Cart: Total $1000+ | ✅ Envío $0 |
| **TC004** | Envío pagado | Cart: Total $999 | ✅ Envío $100 |
| **TC005** | Precio manipulado | Client: $500, Server: $600 | ❌ Validación falla |
| **TC006** | Diferencia mínima | Diferencia: $0.50 | ✅ Dentro de tolerancia |
| **TC007** | Carrito vacío | Cart: [] | ❌ Error de validación |

### 5.2 Casos de Prueba de Seguridad

```javascript
// Ejemplo de test de seguridad
describe('Price Validation Security Tests', () => {
  test('Should reject manipulated cart total', async () => {
    const cart = [
      { id: '1', name: 'Product A', price: 100, quantity: 2, isSubscription: false }
    ]
    const manipulatedTotal = 50 // Total real: 200 + 100 envío = 300
    
    const response = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, total: manipulatedTotal })
    })
    
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Price validation failed'
    })
  })
  
  test('Should handle subscription discount correctly', async () => {
    const cart = [
      { id: '1', name: 'Subscription', price: 1000, quantity: 1, isSubscription: true }
    ]
    const correctTotal = 900 // 1000 * 0.9, sin envío por ser >$1000
    
    const response = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, total: correctTotal })
    })
    
    expect(response.status).toBe(200)
  })
})
```

### 5.3 Monitoreo y Alertas

```typescript
// lib/price-monitoring.ts
export class PriceMonitoringService {
  static async logDiscrepancy(discrepancy: PriceDiscrepancy) {
    // Log en base de datos
    await this.saveDiscrepancy(discrepancy)
    
    // Alerta si la discrepancia es significativa
    if (discrepancy.difference > 50) {
      await this.sendAlert(discrepancy)
    }
    
    // Métricas para dashboard
    await this.updateMetrics(discrepancy)
  }
  
  private static async sendAlert(discrepancy: PriceDiscrepancy) {
    // Enviar email a administradores
    // Notificación Slack/Discord
    // Log crítico en sistema de monitoreo
  }
}
```

## 6. Plan de Implementación

### 6.1 Fases de Implementación

**Fase 1: Validación Básica (Semana 1)**
- Implementar validación en `create-preference`
- Crear servicio de validación de precios
- Tests unitarios básicos

**Fase 2: Validación Completa (Semana 2)**
- Validación en webhooks
- Tabla de discrepancias
- Logging y monitoreo

**Fase 3: Monitoreo Avanzado (Semana 3)**
- Dashboard de discrepancias
- Alertas automáticas
- Métricas y reportes

### 6.2 Consideraciones de Despliegue

- **Rollback plan:** Mantener endpoints sin validación como respaldo
- **Feature flags:** Activar validación gradualmente
- **Monitoring:** Alertas en tiempo real para discrepancias
- **Testing:** Pruebas exhaustivas en staging antes de producción

## 7. Conclusiones y Recomendaciones

### 7.1 Prioridades Críticas

1. **Implementar validación en create-preference** (Crítico)
2. **Agregar logging de discrepancias** (Alto)
3. **Crear tabla de auditoría** (Alto)
4. **Implementar alertas automáticas** (Medio)

### 7.2 Beneficios Esperados

- **Seguridad:** Prevención de manipulación de precios
- **Integridad:** Garantía de consistencia de datos
- **Auditoría:** Trazabilidad completa de transacciones
- **Confianza:** Mayor seguridad para el negocio

### 7.3 Métricas de Éxito

- **0 discrepancias no detectadas** en producción
- **< 1 segundo** de latencia adicional en checkout
- **100% de cobertura** en casos de prueba críticos
- **Alertas en < 5 minutos** para discrepancias significativas

Este documento proporciona una hoja de ruta completa para implementar la validación de precios entre el carrito de compras y MercadoPago, asegurando la integridad financiera del sistema.