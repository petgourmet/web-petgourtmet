"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFacebookPixel } from "@/hooks/use-facebook-pixel"

export default function TestFacebookPixelPage() {
  const {
    trackEvent,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackLead,
    trackCompleteRegistration,
    trackSearch,
    trackSubscribe,
  } = useFacebookPixel()

  const handleTestEvent = () => {
    trackEvent("TestButtonClick", { source: "test_page" })
  }

  const handleTestViewContent = () => {
    trackViewContent("test-product-1", "Producto de Prueba", "product", 299)
  }

  const handleTestAddToCart = () => {
    trackAddToCart("test-product-1", "Producto de Prueba", 299, 1)
  }

  const handleTestInitiateCheckout = () => {
    trackInitiateCheckout(598, 2, ["test-product-1", "test-product-2"])
  }

  const handleTestPurchase = () => {
    trackPurchase(598, "test-order-123", ["test-product-1", "test-product-2"], 2)
  }

  const handleTestLead = () => {
    trackLead(0, "Newsletter Subscription")
  }

  const handleTestRegistration = () => {
    trackCompleteRegistration("email")
  }

  const handleTestSearch = () => {
    trackSearch("comida para perros", "pet_food")
  }

  const handleTestSubscribe = () => {
    trackSubscribe(299)
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>📘 Prueba de Facebook Pixel</CardTitle>
          <CardDescription>
            Esta página te permite probar que Facebook Pixel está funcionando correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleTestEvent} variant="outline" className="w-full">
              Evento Personalizado
            </Button>
            
            <Button onClick={handleTestViewContent} variant="outline" className="w-full">
              Ver Contenido
            </Button>
            
            <Button onClick={handleTestAddToCart} variant="outline" className="w-full">
              Agregar al Carrito
            </Button>
            
            <Button onClick={handleTestInitiateCheckout} variant="outline" className="w-full">
              Iniciar Checkout
            </Button>
            
            <Button onClick={handleTestPurchase} variant="outline" className="w-full">
              Compra
            </Button>
            
            <Button onClick={handleTestLead} variant="outline" className="w-full">
              Lead/Suscripción
            </Button>
            
            <Button onClick={handleTestRegistration} variant="outline" className="w-full">
              Registro Completo
            </Button>
            
            <Button onClick={handleTestSearch} variant="outline" className="w-full">
              Búsqueda
            </Button>
            
            <Button onClick={handleTestSubscribe} variant="outline" className="w-full">
              Suscribirse
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">📊 Configuración de Facebook Pixel</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Pixel ID:</strong> 840370127164134</p>
              <p><strong>Conjunto de Datos:</strong> 840370127164134</p>
              <p><strong>Página:</strong> Pet Gourmet Mx (101255416061066)</p>
              <p><strong>Instagram:</strong> Pet Gourmet México 🎂 (17841454813270642)</p>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Instrucciones para verificar:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Instala la extensión "Facebook Pixel Helper" en Chrome</li>
              <li>Abre las herramientas de desarrollador (F12)</li>
              <li>Ve a la pestaña "Red" o "Network"</li>
              <li>Filtra por "facebook" o "fbevents"</li>
              <li>Haz clic en cualquier botón de prueba</li>
              <li>Deberías ver requests a Facebook</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Verificación en Meta Events Manager:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ve a tu cuenta de Meta Business</li>
              <li>Navega a "Events Manager"</li>
              <li>Selecciona tu pixel (840370127164134)</li>
              <li>Ve a "Test Events" o "Eventos de Prueba"</li>
              <li>Haz clic en los botones de prueba</li>
              <li>Los eventos deberían aparecer en tiempo real</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-green-800">✅ Eventos Estándar Configurados</h3>
            <div className="text-sm text-green-700 grid grid-cols-2 gap-2">
              <div>• PageView</div>
              <div>• ViewContent</div>
              <div>• AddToCart</div>
              <div>• InitiateCheckout</div>
              <div>• Purchase</div>
              <div>• Lead</div>
              <div>• CompleteRegistration</div>
              <div>• Search</div>
              <div>• Subscribe</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
