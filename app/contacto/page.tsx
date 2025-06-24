export default function ContactoPage() {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 min-h-screen">
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column - Company Information */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">CENTRO DE PRODUCCIÓN PET GOURMET</h1>
                <div className="space-y-3 text-gray-600">
                  <p className="text-lg">Avenida José María Castorena 425, plaza Cuajimalpa Local 6</p>
                  <p className="text-lg">Cuajimalpa, Ciudad de México</p>
                  <p className="text-lg">
                    <span className="font-medium">Email:</span> contacto@petgourmet.mx
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Teléfono:</span> +525561269681
                  </p>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                <p className="text-gray-700 leading-relaxed">
                  Suscribete y conoce la Cocina Gourmet para Mascotas Pet Gourmet. Recetas 100% naturales y saludables
                  para complementar el alimento convencional de nuestros peludos.
                </p>
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="h-80">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.5!2d-99.2944!3d19.3656!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85ce02c7e5b6d5a7%3A0x8b5c5e5e5e5e5e5e!2sAv.%20Jos%C3%A9%20Mar%C3%ADa%20Castorena%20425%2C%20Cuajimalpa%2C%20Ciudad%20de%20M%C3%A9xico!5e0!3m2!1ses!2smx!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Ubicación Pet Gourmet Santa Fe"
                  ></iframe>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-[#7BBDC5] mb-2">Envíanos un mensaje</h2>
              <p className="text-gray-600 mb-8">
                ¡Estaremos atentos a dar respuesta a tus preguntas! Por favor llena el formulario de abajo con tus datos
                y contáctanos.
              </p>

              <form className="space-y-6">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-[#7BBDC5] mb-2">
                    NOMBRE (requerido)*
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#7BBDC5] focus:border-[#7BBDC5] transition-colors"
                    placeholder="Escribe tu nombre"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#7BBDC5] mb-2">
                    EMAIL (requerido)*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#7BBDC5] focus:border-[#7BBDC5] transition-colors"
                    placeholder="Escribe tu email"
                  />
                </div>

                <div>
                  <label htmlFor="celular" className="block text-sm font-medium text-[#7BBDC5] mb-2">
                    CELULAR (requerido)*
                  </label>
                  <input
                    type="tel"
                    id="celular"
                    name="celular"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#7BBDC5] focus:border-[#7BBDC5] transition-colors"
                    placeholder="Escribe tu número de celular"
                  />
                </div>

                <div>
                  <label htmlFor="mensaje" className="block text-sm font-medium text-[#7BBDC5] mb-2">
                    TU MENSAJE (requerido)*
                  </label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    rows={5}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#7BBDC5] focus:border-[#7BBDC5] transition-colors resize-none"
                    placeholder="Escribe tu mensaje..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#7BBDC5] text-white font-medium py-3 px-6 rounded-md hover:bg-[#6AABB2] transition-colors duration-200 focus:ring-2 focus:ring-[#7BBDC5] focus:ring-offset-2"
                >
                  ENVIAR
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
