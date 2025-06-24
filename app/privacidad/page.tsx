export default function PrivacidadPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Política de Privacidad</h1>

        <div className="max-w-3xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-6">Última actualización: 1 de enero de 2023</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
              <p>
                En Pet Gourmet, respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta
                Política de Privacidad describe cómo recopilamos, utilizamos y compartimos su información cuando visita
                nuestro sitio web o realiza una compra.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Información que Recopilamos</h2>
              <p className="mb-4">Podemos recopilar los siguientes tipos de información:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Información personal:</strong> Nombre, dirección de correo electrónico, dirección postal,
                  número de teléfono, información de pago y cualquier otra información que usted nos proporcione
                  voluntariamente.
                </li>
                <li>
                  <strong>Información de uso:</strong> Datos sobre cómo interactúa con nuestro sitio, incluyendo páginas
                  visitadas, tiempo de permanencia, productos vistos y acciones realizadas.
                </li>
                <li>
                  <strong>Información del dispositivo:</strong> Tipo de dispositivo, sistema operativo, tipo de
                  navegador, dirección IP y configuración de idioma.
                </li>
                <li>
                  <strong>Información de cookies:</strong> Utilizamos cookies y tecnologías similares para mejorar su
                  experiencia en nuestro sitio.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Cómo Utilizamos su Información</h2>
              <p className="mb-4">Utilizamos la información recopilada para:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Procesar y completar sus pedidos</li>
                <li>Comunicarnos con usted sobre sus pedidos, productos o consultas</li>
                <li>Personalizar su experiencia en nuestro sitio</li>
                <li>Mejorar nuestro sitio web y nuestros productos</li>
                <li>
                  Enviarle información sobre promociones, ofertas especiales o nuevos productos (si ha dado su
                  consentimiento)
                </li>
                <li>Prevenir fraudes y proteger la seguridad de nuestro sitio</li>
                <li>Cumplir con nuestras obligaciones legales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Compartir su Información</h2>
              <p className="mb-4">Podemos compartir su información personal con:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Proveedores de servicios:</strong> Empresas que nos ayudan a operar nuestro sitio, procesar
                  pagos, entregar productos, etc.
                </li>
                <li>
                  <strong>Socios comerciales:</strong> Con su consentimiento, podemos compartir información con socios
                  seleccionados.
                </li>
                <li>
                  <strong>Autoridades legales:</strong> Cuando sea necesario para cumplir con una obligación legal o
                  proteger nuestros derechos.
                </li>
              </ul>
              <p className="mt-4">No vendemos ni alquilamos su información personal a terceros.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Seguridad de los Datos</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra
                acceso no autorizado, pérdida o alteración. Sin embargo, ninguna transmisión por Internet o
                almacenamiento electrónico es 100% segura, por lo que no podemos garantizar su seguridad absoluta.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Sus Derechos</h2>
              <p className="mb-4">Usted tiene derecho a:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Acceder a sus datos personales</li>
                <li>Rectificar datos inexactos</li>
                <li>Solicitar la eliminación de sus datos</li>
                <li>Oponerse al procesamiento de sus datos</li>
                <li>Retirar su consentimiento en cualquier momento</li>
                <li>Presentar una queja ante una autoridad de protección de datos</li>
              </ul>
              <p className="mt-4">Para ejercer estos derechos, contáctenos a través de contacto@petgourmet.mx.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Cambios a esta Política</h2>
              <p>
                Podemos actualizar esta Política de Privacidad periódicamente. La versión más reciente estará siempre
                disponible en nuestro sitio web. Le recomendamos revisar esta política regularmente para estar informado
                sobre cómo protegemos su información.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Contacto</h2>
              <p>
                Si tiene preguntas sobre esta Política de Privacidad o sobre cómo manejamos sus datos personales,
                contáctenos a:
              </p>
              <p className="mt-4">
                <strong>Email:</strong> contacto@petgourmet.mx
                <br />
                <strong>Teléfono:</strong> +525561269681
                <br />
                <strong>Dirección:</strong> Avenida José María Castorena 425, plaza Cuajimalpa Local 6 Cuajimalpa, Ciudad de México
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
