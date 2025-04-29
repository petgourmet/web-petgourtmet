import { ThemedBackground } from "@/components/themed-background"

export default function ContactoPage() {
  return (
    <ThemedBackground theme="default">
      <div className="container mx-auto px-4 py-24 min-h-screen">
        <h1 className="text-4xl font-bold text-center mb-12">Contáctanos</h1>

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Información de Contacto</h2>
              <div className="space-y-4">
                <p className="flex items-start">
                  <span className="font-medium w-24">Dirección:</span>
                  <span>Av. Principal 123, Ciudad de México, México</span>
                </p>
                <p className="flex items-start">
                  <span className="font-medium w-24">Teléfono:</span>
                  <span>+52 55 1234 5678</span>
                </p>
                <p className="flex items-start">
                  <span className="font-medium w-24">Email:</span>
                  <span>info@petgourmet.mx</span>
                </p>
                <p className="flex items-start">
                  <span className="font-medium w-24">Horario:</span>
                  <span>
                    Lunes a Viernes: 9:00 - 18:00
                    <br />
                    Sábados: 10:00 - 14:00
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Envíanos un Mensaje</h2>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Asunto de tu mensaje"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Escribe tu mensaje aquí..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Nuestra Ubicación</h2>
            <div className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden">
              {/* Aquí iría un mapa, pero por ahora usamos un placeholder */}
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Mapa de ubicación</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
