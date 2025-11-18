# 🧪 Testing Rápido - Stripe & PetGourmet

## ✅ Estado Actual: LISTO PARA TESTING

**Servidor**: ✅ Corriendo en http://localhost:3000  
**Stripe**: ✅ Conectado (Modo TEST)  
**Tests E2E**: ✅ 6/6 pasados (100%)

---

## 🚀 Inicio Rápido

### 1. Verificar Todo (Recomendado primero)
```bash
pnpm stripe:e2e
```
Ejecuta todas las pruebas: configuración, conexión, creación de cliente, producto, checkout.

### 2. Crear Productos de Prueba
```bash
pnpm stripe:setup
```
Crea 4 productos:
- Plan Premium Mensual ($799/mes)
- Plan Premium Anual ($7,670/año)  
- Comida Premium ($499)
- Snacks Premium ($199)

### 3. Probar Checkout
```bash
pnpm stripe:checkout
```
Genera URL de pago → Copiar y abrir en navegador

---

## 💳 Tarjeta de Prueba

**Pago Exitoso:**
```
Número: 4242 4242 4242 4242
Fecha: 12/34 (cualquier futura)
CVC: 123 (cualquier)
```

**Más tarjetas:** https://docs.stripe.com/testing#cards

---

## 📋 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm stripe:e2e` | 🧪 Test completo E2E |
| `pnpm stripe:test` | ✅ Verificar configuración |
| `pnpm stripe:setup` | 📦 Crear productos |
| `pnpm stripe:checkout` | 💳 Probar checkout |
| `pnpm dev` | 🚀 Servidor desarrollo |
| `pnpm test` | 🔬 Tests unitarios |

---

## 🔗 Dashboards

- **Pagos**: https://dashboard.stripe.com/test/payments
- **Productos**: https://dashboard.stripe.com/test/products
- **Clientes**: https://dashboard.stripe.com/test/customers
- **Logs**: https://dashboard.stripe.com/test/logs

---

## 📚 Documentación Completa

Ver `/docs/TESTING-GUIDE.md` para:
- Guía detallada de testing
- Escenarios de prueba
- Troubleshooting
- Testing de webhooks
- Y más...

---

## ⚡ Flujo de Testing Recomendado

1. **Verificar sistema**: `pnpm stripe:e2e`
2. **Crear productos**: `pnpm stripe:setup`
3. **Generar checkout**: `pnpm stripe:checkout`
4. **Abrir URL en navegador**
5. **Completar con tarjeta 4242...**
6. **Verificar en dashboard**

---

## 🎯 Resultado de Tests

```
✅ Test 1: Configuración
✅ Test 2: Conexión API
✅ Test 3: Crear Cliente
✅ Test 4: Crear Producto
✅ Test 5: Crear Checkout
✅ Test 6: Recuperar Sesión

Resultado: 6/6 pruebas pasaron (100%)
```

**¡Todo listo para comenzar testing!** 🎉
