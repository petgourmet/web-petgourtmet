import { Mail, MapPin, Phone } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contacto" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">Contáctanos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-primary">Información de Contacto</h3>

            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-primary mt-1 mr-3" />
                <div>
                  <p className="font-medium">Dirección</p>
                  <p className="text-gray-600">Av. Principal 123, Ciudad de México, México</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="w-5 h-5 text-primary mt-1 mr-3" />
                <div>
                  <p className="font-medium">Teléfono</p>
                  <p className="text-gray-600">+52 (55) 1234-5678</p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="w-5 h-5 text-primary mt-1 mr-3" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600">contacto@petgourmet.mx</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">Horario de Atención</h4>
              <p className="text-gray-600">Lunes a Viernes: 9:00 AM - 6:00 PM</p>
              <p className="text-gray-600">Sábados: 10:00 AM - 2:00 PM</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-primary">Envíanos un Mensaje</h3>

            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="¿En qué podemos ayudarte?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors duration-300"
              >
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
