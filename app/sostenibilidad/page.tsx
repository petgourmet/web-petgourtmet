import { ThemedBackground } from "@/components/themed-background"

export default function SostenibilidadPage() {
  return (
    <ThemedBackground theme="default">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Nuestro Compromiso con la Sostenibilidad</h1>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6">Ingredientes Sostenibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="mb-4">
                  En Pet Gourmet, nos comprometemos a utilizar ingredientes de origen sostenible y de alta calidad.
                  Trabajamos directamente con productores locales que comparten nuestra visión de un futuro más
                  sostenible.
                </p>
                <p>Nuestros ingredientes son seleccionados cuidadosamente para garantizar que sean:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Cultivados de manera responsable</li>
                  <li>Libres de pesticidas dañinos</li>
                  <li>De temporada y locales cuando es posible</li>
                  <li>Procesados con métodos que conservan sus nutrientes</li>
                </ul>
              </div>
              <div className="relative h-64 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg"></div>
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">Imagen de ingredientes sostenibles</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6">Empaques Eco-amigables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="order-2 md:order-1 relative h-64 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg"></div>
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">Imagen de empaques eco-amigables</p>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <p className="mb-4">
                  Estamos comprometidos a reducir nuestro impacto ambiental a través de empaques innovadores y
                  sostenibles. Nuestros esfuerzos incluyen:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Uso de materiales biodegradables y compostables</li>
                  <li>Reducción del plástico de un solo uso</li>
                  <li>Empaques reciclables y reutilizables</li>
                  <li>Tintas vegetales para la impresión</li>
                </ul>
                <p className="mt-4">
                  Para 2025, nos comprometemos a que el 100% de nuestros empaques sean completamente sostenibles y
                  libres de plástico.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Huella de Carbono</h2>
            <p className="mb-6">
              Estamos trabajando activamente para reducir nuestra huella de carbono en toda nuestra cadena de
              suministro. Algunas de nuestras iniciativas incluyen:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/50 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">Energía Renovable</h3>
                <p>
                  Nuestras instalaciones funcionan con energía 100% renovable, reduciendo significativamente nuestras
                  emisiones de CO2.
                </p>
              </div>

              <div className="bg-white/50 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">Logística Optimizada</h3>
                <p>
                  Optimizamos nuestras rutas de distribución y utilizamos vehículos de bajas emisiones para reducir el
                  impacto ambiental.
                </p>
              </div>

              <div className="bg-white/50 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">Compensación de Carbono</h3>
                <p>
                  Invertimos en proyectos de reforestación y energías renovables para compensar las emisiones que aún no
                  podemos eliminar.
                </p>
              </div>
            </div>

            <p>
              Nuestro objetivo es ser una empresa carbono neutral para 2030, y estamos en camino de lograrlo gracias a
              nuestras políticas ambientales progresivas y el compromiso de todo nuestro equipo.
            </p>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
