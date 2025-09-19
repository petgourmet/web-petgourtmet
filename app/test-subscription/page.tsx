"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-context'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export default function TestSubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [autoExecuted, setAutoExecuted] = useState(false)
  const { addToCart, clearCart } = useCart()
  const { user } = useAuth()

  const testProduct = {
    id: 1, // ID del producto "Pechuga de pollo"
    name: "Pechuga de pollo",
    price: 45.00,
    image: "/placeholder.svg",
    size: "Standard",
    quantity: 1,
    isSubscription: true,
    subscriptionType: "monthly" as const,
    subscriptionDiscount: 10,
    monthly_discount: 10
  }

  // Auto-ejecutar la prueba cuando se carga la página
  useEffect(() => {
    if (!autoExecuted && !loading && user) {
      console.log('🚀 Auto-ejecutando prueba de suscripción...');
      const timer = setTimeout(() => {
        simulateSubscriptionFlow();
        setAutoExecuted(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoExecuted, loading, user]);

  const simulateSubscriptionFlow = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('🧪 Iniciando simulación del flujo de suscripción...')
      
      // 1. Obtener un producto real de la base de datos
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, price, image, monthly_discount')
        .eq('subscription_available', true)
        .limit(1)
        .single();
      
      if (productError || !products) {
        console.error('❌ Error al obtener producto:', productError);
        setResult({ error: 'No se pudo obtener un producto para la prueba' });
        setLoading(false);
        return;
      }
      
      const realTestProduct = {
        id: products.id,
        name: products.name,
        price: products.price,
        image: products.image,
        size: 'Standard',
        quantity: 1,
        isSubscription: true,
        subscriptionType: "monthly" as const,
        subscriptionDiscount: products.monthly_discount || 10,
        monthly_discount: products.monthly_discount || 10
      };
      
      console.log('✅ Producto obtenido de la base de datos:', realTestProduct);
      
      // Limpiar carrito y agregar producto real
      clearCart()
      addToCart(realTestProduct)
      
      // 2. Simular el proceso de checkout
      const externalReference = `TEST-SUB-${Date.now()}`
      const subscriptionType = 'monthly'
      
      // Calcular precios como en el checkout real
      const basePrice = realTestProduct.price
      const discountPercentage = realTestProduct.monthly_discount || 10
      const discountedPrice = basePrice * (1 - discountPercentage / 100)
      const transactionAmount = discountedPrice * realTestProduct.quantity
      
      console.log('📊 Cálculos de precio:', {
        basePrice,
        discountPercentage,
        discountedPrice,
        transactionAmount
      })
      
      // Verificar que el usuario esté autenticado
      if (!user?.id) {
        console.error('❌ Usuario no autenticado');
        setResult({ error: 'Usuario no autenticado' });
        setLoading(false);
        return;
      }

      // 3. Crear datos de suscripción como en el checkout real
      const subscriptionData = {
        user_id: user.id, // Usar el ID real del usuario autenticado
        product_id: realTestProduct.id,
        product_name: realTestProduct.name,
        product_image: realTestProduct.image,
        subscription_type: subscriptionType,
        status: 'active', // Directamente activa para prueba
        external_reference: externalReference,
        base_price: basePrice,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        transaction_amount: transactionAmount,
        size: testProduct.size,
        quantity: testProduct.quantity,
        processed_at: new Date().toISOString(),
        customer_data: {
          firstName: 'Usuario',
          lastName: 'Prueba',
          email: user?.email || 'test@example.com',
          phone: '+52 123 456 7890'
        }
      }
      
      console.log('💾 Guardando suscripción:', subscriptionData)
      
      // 4. Guardar en la base de datos
      const { data: insertedData, error: subscriptionError } = await supabase
        .from('unified_subscriptions')
        .insert(subscriptionData)
        .select()
      
      if (subscriptionError) {
        console.error('❌ Error al guardar suscripción:', subscriptionError)
        throw subscriptionError
      }
      
      console.log('✅ Suscripción guardada exitosamente:', insertedData)
      
      // 5. Verificar que se guardaron los campos correctamente
      const savedSubscription = insertedData[0]
      const verification = {
        id: savedSubscription.id,
        base_price: savedSubscription.base_price,
        discount_percentage: savedSubscription.discount_percentage,
        discounted_price: savedSubscription.discounted_price,
        transaction_amount: savedSubscription.transaction_amount,
        status: savedSubscription.status
      }
      
      console.log('🔍 Verificación de campos:', verification)
      
      // Verificar que no hay precios en $0.00
      const hasZeroPrices = [
        savedSubscription.base_price,
        savedSubscription.discounted_price,
        savedSubscription.transaction_amount
      ].some(price => price === 0 || price === null)
      
      const testResult = {
        success: true,
        subscription: verification,
        hasZeroPrices,
        message: hasZeroPrices 
          ? '⚠️ PROBLEMA: Hay precios en $0.00' 
          : '✅ ÉXITO: Todos los precios son correctos',
        calculations: {
          basePrice,
          discountPercentage: discountPercentage + '%',
          discountedPrice,
          transactionAmount
        }
      }
      
      setResult(testResult)
      
      toast({
        title: testResult.hasZeroPrices ? "Problema detectado" : "Prueba exitosa",
        description: testResult.message,
        variant: testResult.hasZeroPrices ? "destructive" : "default"
      })
      
    } catch (error: any) {
      console.error('❌ Error en la prueba:', error)
      setResult({
        success: false,
        error: error.message || 'Error desconocido',
        details: error
      })
      
      toast({
        title: "Error en la prueba",
        description: error.message || 'Error desconocido',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🧪 Prueba del Flujo de Suscripción</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Producto de Prueba</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Nombre:</strong> {testProduct.name}</div>
          <div><strong>Precio base:</strong> ${testProduct.price}</div>
          <div><strong>Descuento mensual:</strong> {testProduct.monthly_discount}%</div>
          <div><strong>Tipo:</strong> Suscripción mensual</div>
        </div>
      </div>
      
      <Button 
        onClick={simulateSubscriptionFlow} 
        disabled={loading}
        className="mb-6"
        size="lg"
      >
        {loading ? '🔄 Ejecutando prueba...' : '▶️ Ejecutar Prueba de Suscripción'}
      </Button>
      
      {result && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {result.success ? '✅ Resultado de la Prueba' : '❌ Error en la Prueba'}
          </h3>
          
          {result.success ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                result.hasZeroPrices 
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300' 
                  : 'bg-green-100 dark:bg-green-900/20 border border-green-300'
              }`}>
                <p className="font-medium">{result.message}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">📊 Cálculos de Precio:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Precio base: ${result.calculations.basePrice}</div>
                  <div>Descuento: {result.calculations.discountPercentage}</div>
                  <div>Precio con descuento: ${result.calculations.discountedPrice}</div>
                  <div>Monto total: ${result.calculations.transactionAmount}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">💾 Datos Guardados:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>ID: {result.subscription.id}</div>
                  <div>Estado: {result.subscription.status}</div>
                  <div>Precio base: ${result.subscription.base_price}</div>
                  <div>Descuento: {result.subscription.discount_percentage}%</div>
                  <div>Precio final: ${result.subscription.discounted_price}</div>
                  <div>Monto transacción: ${result.subscription.transaction_amount}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg border border-red-300">
              <p className="font-medium text-red-800 dark:text-red-200">Error: {result.error}</p>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-300 overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
        <p><strong>Objetivo:</strong> Verificar que los campos base_price, discount_percentage, discounted_price y transaction_amount se guarden correctamente en unified_subscriptions.</p>
        <p><strong>Resultado esperado:</strong> Todos los precios deben ser mayores a $0.00 y reflejar los cálculos correctos.</p>
      </div>
    </div>
  )
}