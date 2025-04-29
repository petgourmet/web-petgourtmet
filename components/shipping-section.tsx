import { Truck, RotateCcw, Clock, CreditCard } from "lucide-react"

export function ShippingSection() {
  return (
    <section id="envios" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">Envíos y Devoluciones</h2>
        <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
          Información importante sobre nuestras políticas de envío, entrega y devoluciones.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <div className="bg-gray-50 p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary">Política de Envíos</h3>
            </div>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Envío gratuito en pedidos superiores a $800 MXN.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Tiempo estimado de entrega: 2-5 días hábiles dependiendo de la ubicación.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Envíos a toda la República Mexicana.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Recibirás un correo electrónico con el número de seguimiento cuando tu pedido sea enviado.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Para pedidos urgentes, contamos con opciones de envío express con costo adicional.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary">Política de Devoluciones</h3>
            </div>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Garantía de satisfacción de 30 días en todos nuestros productos.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>
                  Si tu mascota no disfruta el producto, ofrecemos reembolso completo o cambio por otro producto.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>
                  Para iniciar una devolución, contacta a nuestro servicio al cliente con tu número de pedido.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Los productos deben estar en su empaque original y no consumidos en más del 25%.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Los costos de envío de devolución son cubiertos por Pet Gourmet.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-50 p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary">Tiempos de Entrega</h3>
            </div>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Ciudad de México y área metropolitana: 1-2 días hábiles.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Ciudades principales: 2-3 días hábiles.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Resto del país: 3-5 días hábiles.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Los pedidos realizados antes de las 2:00 PM se procesan el mismo día.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary">Métodos de Pago</h3>
            </div>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Tarjetas de crédito y débito (Visa, Mastercard, American Express).</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>PayPal.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Transferencia bancaria.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Pago en OXXO (se aplican cargos adicionales).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
