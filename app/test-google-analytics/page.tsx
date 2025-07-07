"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGoogleAnalytics } from "@/hooks/use-google-analytics"

export default function TestGoogleAnalyticsPage() {
  const { trackEvent, trackViewItem, trackAddToCart, trackBeginCheckout, trackPurchase, trackSearch } = useGoogleAnalytics()

  const handleTestEvent = () => {
    trackEvent("test_button_click", "engagement", "Test Google Analytics")
  }

  const handleTestViewItem = () => {
    trackViewItem("test-product-1", "Producto de Prueba", "test-category", 299)
  }

  const handleTestAddToCart = () => {
    trackAddToCart("test-product-1", "Producto de Prueba", "test-category", 299, 1)
  }

  const handleTestBeginCheckout = () => {
    trackBeginCheckout(598, [
      {
        item_id: "test-product-1",
        item_name: "Producto de Prueba 1",
        category: "test-category",
        price: 299,
        quantity: 1,
      },
      {
        item_id: "test-product-2",
        item_name: "Producto de Prueba 2",
        category: "test-category",
        price: 299,
        quantity: 1,
      },
    ])
  }

  const handleTestPurchase = () => {
    trackPurchase("test-transaction-123", 598, [
      {
        item_id: "test-product-1",
        item_name: "Producto de Prueba 1",
        category: "test-category",
        price: 299,
        quantity: 1,
      },
      {
        item_id: "test-product-2",
        item_name: "Producto de Prueba 2",
        category: "test-category",
        price: 299,
        quantity: 1,
      },
    ])
  }

  const handleTestSearch = () => {
    trackSearch("comida para perros")
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🔍 Prueba de Google Analytics</CardTitle>
          <CardDescription>
            Esta página te permite probar que Google Analytics está funcionando correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleTestEvent} variant="outline" className="w-full">
              Evento de Prueba
            </Button>
            
            <Button onClick={handleTestViewItem} variant="outline" className="w-full">
              Ver Producto
            </Button>
            
            <Button onClick={handleTestAddToCart} variant="outline" className="w-full">
              Agregar al Carrito
            </Button>
            
            <Button onClick={handleTestBeginCheckout} variant="outline" className="w-full">
              Iniciar Checkout
            </Button>
            
            <Button onClick={handleTestPurchase} variant="outline" className="w-full">
              Compra Exitosa
            </Button>
            
            <Button onClick={handleTestSearch} variant="outline" className="w-full">
              Búsqueda
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">📊 Configuración de Google Analytics</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>ID de Medición:</strong> G-W4V4C0VK09</p>
              <p><strong>ID del Flujo:</strong> 4170066584</p>
              <p><strong>URL del Flujo:</strong> https://petgourmet.mx</p>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Instrucciones para verificar:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Abre las herramientas de desarrollador (F12)</li>
              <li>Ve a la pestaña "Red" o "Network"</li>
              <li>Filtra por "google-analytics" o "gtag"</li>
              <li>Haz clic en cualquier botón de prueba</li>
              <li>Deberías ver requests a Google Analytics</li>
              <li>También puedes usar la extensión "Google Analytics Debugger"</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Verificación en tiempo real:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ve a tu cuenta de Google Analytics</li>
              <li>Navega a "Informes" → "Tiempo real" → "Eventos"</li>
              <li>Haz clic en los botones de prueba</li>
              <li>Los eventos deberían aparecer en tiempo real</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
