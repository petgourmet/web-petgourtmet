import { Leaf, Recycle, Droplets } from "lucide-react"

export function SustainabilitySection() {
  return (
    <section id="sostenibilidad" className="py-16 bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">
          Nuestro Compromiso con la Sostenibilidad
        </h2>
        <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
          En Pet Gourmet, creemos que cuidar a nuestras mascotas también significa cuidar del planeta que compartimos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Ingredientes Sostenibles</h3>
            <p className="text-gray-600">
              Seleccionamos cuidadosamente ingredientes de proveedores locales que comparten nuestros valores de
              sostenibilidad y prácticas agrícolas responsables.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Recycle className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Empaques Eco-amigables</h3>
            <p className="text-gray-600">
              Nuestros empaques están diseñados para minimizar el impacto ambiental, utilizando materiales reciclables y
              biodegradables siempre que sea posible.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Huella Hídrica Reducida</h3>
            <p className="text-gray-600">
              Optimizamos nuestros procesos de producción para reducir el consumo de agua y minimizar nuestra huella
              hídrica en cada etapa.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4 text-primary text-center">Nuestras Metas para 2025</h3>

          <div className="space-y-6">
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: "75%" }}></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium text-gray-600">Empaques 100% reciclables</span>
                <span className="text-sm font-medium text-green-600">75%</span>
              </div>
            </div>

            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: "60%" }}></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium text-gray-600">Reducción de emisiones de carbono</span>
                <span className="text-sm font-medium text-green-600">60%</span>
              </div>
            </div>

            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: "40%" }}></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium text-gray-600">Energía 100% renovable</span>
                <span className="text-sm font-medium text-green-600">40%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
