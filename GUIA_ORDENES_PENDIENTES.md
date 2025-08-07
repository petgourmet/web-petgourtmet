# 🔍 Guía para Manejar Órdenes Pendientes - PetGourmet

## 📋 Problema Identificado

Se encontraron **8 órdenes pendientes** en el sistema, incluyendo varias de $418 que el usuario menciona como pagadas pero que aparecen como pendientes.

## 🔍 Análisis de la Situación

### Órdenes Encontradas:
- **Orden 121**: Fabian Gutierrez - $418 (pendiente)
- **Orden 118**: cristofer scalante - $418 (pendiente) 
- **Orden 117**: cristofer scalante - $418 (pendiente)
- **Otras**: Múltiples órdenes pendientes de diferentes usuarios

### ⚠️ Problema Principal:
**Todas las órdenes pendientes tienen "MercadoPago ID: No asignado"**

Esto significa que:
1. El proceso de pago no se completó correctamente
2. No se generó un ID de pago en MercadoPago
3. El webhook no puede actualizar el estado porque no hay referencia de pago

## 🛠️ Soluciones Disponibles

### 1. 🔍 Herramienta de Búsqueda y Actualización

Se creó un script para ayudar a encontrar y manejar órdenes pendientes:

```bash
# Mostrar todas las órdenes pendientes
node scripts/find-and-update-pending-orders.js

# Buscar por nombre, email o ID
node scripts/find-and-update-pending-orders.js buscar "cristofer"
node scripts/find-and-update-pending-orders.js buscar "fabian"
node scripts/find-and-update-pending-orders.js buscar "418"

# Verificar estado de pago (solo si tiene MercadoPago ID)
node scripts/find-and-update-pending-orders.js verificar 121
```

### 2. 🌐 Interfaz Web de Administración

**Acceso**: `http://localhost:3000/admin/orders`

**Funcionalidades disponibles**:
- ✅ **Búsqueda avanzada**: Por ID, nombre del cliente, o email
- ✅ **Filtros por estado**: Pendiente, procesando, completado, cancelado
- ✅ **Vista detallada**: Click en cualquier orden para ver detalles completos
- ✅ **Actualización manual**: Botón "Verificar Estado" en cada orden

**Pasos para usar la interfaz**:
1. Ir a `/admin/orders`
2. Usar el campo de búsqueda para encontrar la orden
3. Click en la orden para ver detalles
4. Si tiene MercadoPago ID, usar "Verificar Estado"

### 3. 📱 Verificación Manual de Pagos

Para órdenes **SIN MercadoPago ID** (como las encontradas):

1. **Verificar en el panel de MercadoPago**:
   - Buscar pagos por monto ($418)
   - Verificar fecha y hora
   - Obtener el ID de pago

2. **Actualizar manualmente en la base de datos**:
   ```sql
   UPDATE orders 
   SET 
     payment_status = 'approved',
     status = 'confirmed',
     mercadopago_payment_id = 'ID_DEL_PAGO',
     confirmed_at = NOW(),
     updated_at = NOW()
   WHERE id = 121; -- Reemplazar con el ID correcto
   ```

## 🚨 Casos Específicos Encontrados

### Caso 1: Órdenes de cristofer scalante
- **Problema**: 5 órdenes pendientes, 2 de $418
- **Causa probable**: Múltiples intentos de pago fallidos
- **Solución**: Verificar cuál pago se completó realmente

### Caso 2: Orden 121 - Fabian Gutierrez ($418)
- **Problema**: Pago reportado como realizado pero orden pendiente
- **Causa probable**: Webhook no recibido o procesado
- **Solución**: Verificar en MercadoPago y actualizar manualmente

## 🔧 Pasos Recomendados

### Para el Usuario Actual:

1. **Identificar la orden correcta**:
   ```bash
   node scripts/find-and-update-pending-orders.js buscar "418"
   ```

2. **Verificar en MercadoPago**:
   - Buscar pagos de $418 en las fechas correspondientes
   - Anotar el ID de pago de MercadoPago

3. **Actualizar la orden**:
   - Si tiene MercadoPago ID: Usar la interfaz web
   - Si no tiene MercadoPago ID: Actualizar manualmente

### Para Prevenir Futuros Problemas:

1. **Verificar configuración del webhook**:
   ```bash
   curl http://localhost:3000/api/mercadopago/webhook
   ```

2. **Monitorear logs del webhook**:
   - Revisar logs de la aplicación
   - Verificar que los webhooks se reciban correctamente

3. **Implementar notificaciones**:
   - Alertas para órdenes que permanezcan pendientes > 24 horas
   - Notificaciones de webhooks fallidos

## 📊 Estadísticas Actuales

- **Total de órdenes**: ~122
- **Órdenes pendientes**: 8 (6.5%)
- **Órdenes sin MercadoPago ID**: 8 (100% de las pendientes)
- **Monto total pendiente**: ~$2,542.41

## 🎯 Próximos Pasos

1. **Inmediato**: Resolver las órdenes pendientes actuales
2. **Corto plazo**: Mejorar el manejo de errores en el proceso de pago
3. **Largo plazo**: Implementar sistema de reconciliación automática

## 📞 Contacto y Soporte

Para resolver casos específicos:
1. Usar la herramienta de búsqueda creada
2. Acceder a la interfaz de administración
3. Verificar manualmente en MercadoPago
4. Actualizar la base de datos según corresponda

---

**Fecha de creación**: $(date)
**Estado**: Herramientas implementadas y listas para usar
**Impacto**: Resolución eficiente de órdenes pendientes