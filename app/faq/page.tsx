import { Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"

export default function RefundPolicyPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Política de Reembolso</h1>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-primary">
              Tu satisfacción y la de tu lomito es lo más importante para nosotros
            </h2>
            <p className="text-lg text-gray-700 mb-6">Recuerda que puedes cancelar tu pedido en línea.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Reembolsos con Tarjeta</h3>
            <p className="text-gray-700 leading-relaxed">
              Los reembolsos realizados a tarjetas de crédito y/o débito son exclusivamente para compras hechas con esa
              misma tarjeta. Los tiempos de procesamiento, dependerán de cada institución bancaria.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Reembolsos de Productos Comestibles</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Si como cliente no quedas conforme con el producto entregado debes comunicarte inmediatamente lo recibas
              en horas y días hábiles a la tienda principal:
            </p>

            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
              <h4 className="text-lg font-bold text-primary mb-4">PET GOURMET MÉXICO</h4>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-gray-800">Centro de producción</p>
                    <p className="text-gray-700">Plaza Cuajimalpa Local 6</p>
                    <p className="text-gray-700">Ciudad de México</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="text-primary flex-shrink-0" size={20} />
                  <a
                    href="mailto:contacto@petgourmet.mx"
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    contacto@petgourmet.mx
                  </a>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="text-primary flex-shrink-0" size={20} />
                  <a
                    href="tel:+525561269681"
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    +52 55 6126 9681
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-8 text-center">
            <h3 className="text-xl font-semibold mb-3">¿Necesitas ayuda?</h3>
            <p className="text-white/90 mb-4">
              Nuestro equipo está aquí para ayudarte con cualquier consulta sobre reembolsos
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center space-x-2 bg-white text-primary px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <Mail size={20} />
              <span>Contáctanos</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
