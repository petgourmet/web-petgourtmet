"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGoogleAnalytics } from "@/hooks/use-google-analytics"
import { useFacebookPixel } from "@/hooks/use-facebook-pixel"
import Link from "next/link"

export default function TestTrackingPage() {
  const gaHook = useGoogleAnalytics()
  const fbHook = useFacebookPixel()

  const handleTestViewProduct = () => {
    // Google Analytics
    gaHook.trackViewItem("test-product-1", "Producto de Prueba Premium", "premium", 299)
    
    // Facebook Pixel
    fbHook.trackViewContent("test-product-1", "Producto de Prueba Premium", "product", 299)
  }

  const handleTestAddToCart = () => {
    // Google Analytics
    gaHook.trackAddToCart("test-product-1", "Producto de Prueba Premium", "premium", 299, 1)
    
    // Facebook Pixel
    fbHook.trackAddToCart("test-product-1", "Producto de Prueba Premium", 299, 1)
  }

  const handleTestBeginCheckout = () => {
    const items = [
      {
        item_id: "test-product-1",
        item_name: "Producto de Prueba Premium",
        category: "premium",
        price: 299,
        quantity: 1,
      },
      {
        item_id: "test-product-2", 
        item_name: "Producto de Prueba Suscripción",
        category: "subscription",
        price: 199,
        quantity: 1,
      },
    ]

    // Google Analytics
    gaHook.trackBeginCheckout(498, items)
    
    // Facebook Pixel
    fbHook.trackInitiateCheckout(498, 2, ["test-product-1", "test-product-2"])
  }

  const handleTestPurchase = () => {
    const items = [
      {
        item_id: "test-product-1",
        item_name: "Producto de Prueba Premium", 
        category: "premium",
        price: 299,
        quantity: 1,
      },
      {
        item_id: "test-product-2",
        item_name: "Producto de Prueba Suscripción",
        category: "subscription", 
        price: 199,
        quantity: 1,
      },
    ]

    // Google Analytics
    gaHook.trackPurchase("test-transaction-" + Date.now(), 498, items)
    
    // Facebook Pixel
    fbHook.trackPurchase(498, "test-order-" + Date.now(), ["test-product-1", "test-product-2"], 2)
  }

  const handleTestSearch = () => {
    // Google Analytics
    gaHook.trackSearch("comida premium para perros")
    
    // Facebook Pixel  
    fbHook.trackSearch("comida premium para perros", "pet_food")
  }

  const handleTestLead = () => {
    // Google Analytics - evento personalizado
    gaHook.trackEvent("generate_lead", "lead_generation", "newsletter_signup")
    
    // Facebook Pixel
    fbHook.trackLead(0, "Newsletter Subscription")
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>🎯 Centro de Pruebas de Tracking</CardTitle>
            <CardDescription>
              Prueba todos los sistemas de tracking (Google Analytics + Facebook Pixel) simultáneamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button onClick={handleTestViewProduct} className="w-full">
                👁️ Ver Producto
              </Button>
              
              <Button onClick={handleTestAddToCart} className="w-full">
                🛒 Agregar al Carrito
              </Button>
              
              <Button onClick={handleTestBeginCheckout} className="w-full">
                💳 Iniciar Checkout
              </Button>
              
              <Button onClick={handleTestPurchase} className="w-full">
                ✅ Compra Exitosa
              </Button>
              
              <Button onClick={handleTestSearch} className="w-full">
                🔍 Búsqueda
              </Button>
              
              <Button onClick={handleTestLead} className="w-full">
                📧 Generar Lead
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">📊 Google Analytics</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>ID de Medición:</strong> G-W4V4C0VK09</p>
                  <p><strong>Estado:</strong> ✅ Configurado</p>
                  <Link href="/test-google-analytics" className="text-blue-600 hover:underline">
                    → Pruebas específicas de GA
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">📘 Facebook Pixel</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Pixel ID:</strong> 840370127164134</p>
                  <p><strong>Estado:</strong> ✅ Configurado</p>
                  <Link href="/test-facebook-pixel" className="text-blue-600 hover:underline">
                    → Pruebas específicas de FB
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Instrucciones de Verificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-800 mb-2">✅ Google Analytics</h4>
                <ul className="text-sm text-green-700 list-disc pl-5 space-y-1">
                  <li>Ve a Google Analytics → Informes → Tiempo real → Eventos</li>
                  <li>Haz clic en los botones de prueba</li>
                  <li>Los eventos aparecen inmediatamente</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">📘 Facebook Pixel</h4>
                <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Instala "Facebook Pixel Helper" en Chrome</li>
                  <li>Ve a Meta Events Manager → Test Events</li>
                  <li>Haz clic en los botones de prueba</li>
                  <li>Los eventos aparecen en tiempo real</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🛠️ DevTools</h4>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  <li>Abre DevTools (F12) → Network</li>
                  <li>Filtra por "gtag" para Google Analytics</li>
                  <li>Filtra por "fbevents" para Facebook Pixel</li>
                  <li>Observa las requests al hacer clic en botones</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 Eventos de Ecommerce Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Google Analytics 4:</h4>
                <ul className="text-sm space-y-1">
                  <li>• view_item</li>
                  <li>• add_to_cart</li>
                  <li>• begin_checkout</li>
                  <li>• purchase</li>
                  <li>• search</li>
                  <li>• generate_lead</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Facebook Pixel:</h4>
                <ul className="text-sm space-y-1">
                  <li>• PageView (automático)</li>
                  <li>• ViewContent</li>
                  <li>• AddToCart</li>
                  <li>• InitiateCheckout</li>
                  <li>• Purchase</li>
                  <li>• Search</li>
                  <li>• Lead</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
