import { ThemedBackground } from "@/components/themed-background"

export default function TerminosPage() {
  return (
    <ThemedBackground theme="default">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Términos y Condiciones</h1>

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-6">Última actualización: 1 de enero de 2023</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
              <p>
                Estos Términos y Condiciones regulan el uso del sitio web Pet Gourmet (en adelante, "el Sitio") y los
                servicios ofrecidos por Pet Gourmet S.A. de C.V. (en adelante, "la Empresa"). Al acceder y utilizar este
                Sitio, usted acepta estos términos en su totalidad. Si no está de acuerdo con estos términos, no utilice
                este Sitio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Uso del Sitio</h2>
              <p className="mb-4">El acceso y uso de este Sitio está sujeto a las siguientes condiciones:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Usted debe tener al menos 18 años de edad o contar con la supervisión de un adulto.</li>
                <li>
                  Usted se compromete a utilizar el Sitio únicamente para fines legales y de manera que no infrinja los
                  derechos de terceros.
                </li>
                <li>
                  Está prohibido utilizar el Sitio de cualquier manera que pueda dañar, deshabilitar, sobrecargar o
                  deteriorar el Sitio o interferir con el uso y disfrute del mismo por parte de terceros.
                </li>
                <li>
                  La Empresa se reserva el derecho de restringir el acceso a ciertas áreas del Sitio o al Sitio completo
                  a su discreción.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Productos y Transacciones</h2>
              <p className="mb-4">Al realizar una compra en nuestro Sitio, usted acepta lo siguiente:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Toda la información proporcionada durante el proceso de compra es precisa y completa.</li>
                <li>Los precios de los productos están sujetos a cambios sin previo aviso.</li>
                <li>La Empresa se reserva el derecho de rechazar o cancelar cualquier pedido por cualquier motivo.</li>
                <li>El pago debe realizarse por completo antes del envío de los productos.</li>
                <li>Los productos están sujetos a disponibilidad.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Propiedad Intelectual</h2>
              <p className="mb-4">
                Todo el contenido incluido en este Sitio, como texto, gráficos, logotipos, imágenes, clips de audio,
                descargas digitales, recopilaciones de datos y software, es propiedad de la Empresa o de sus proveedores
                de contenido y está protegido por las leyes de propiedad intelectual.
              </p>
              <p>
                Está prohibida la reproducción, distribución, modificación, exhibición pública, transmisión o cualquier
                otro uso del contenido del Sitio sin el consentimiento previo por escrito de la Empresa.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Limitación de Responsabilidad</h2>
              <p className="mb-4">La Empresa no será responsable por:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Cualquier daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la
                  imposibilidad de usar el Sitio.
                </li>
                <li>
                  Cualquier falla o interrupción en la disponibilidad del Sitio debido a circunstancias fuera del
                  control de la Empresa.
                </li>
                <li>
                  Cualquier error, omisión, interrupción, eliminación, defecto, demora en la operación o transmisión,
                  falla de línea de comunicación, robo o destrucción o acceso no autorizado al Sitio.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Ley Aplicable</h2>
              <p>
                Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de México, sin tener en
                cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja en relación con estos
                términos estará sujeta a la jurisdicción exclusiva de los tribunales de la Ciudad de México.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Modificaciones</h2>
              <p>
                La Empresa se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las
                modificaciones entrarán en vigor inmediatamente después de su publicación en el Sitio. Su uso continuado
                del Sitio después de dichas modificaciones constituirá su aceptación de los términos modificados.
              </p>
            </section>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
