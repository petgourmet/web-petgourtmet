export default function EnviosPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Envíos y Devoluciones</h1>

        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Política de Envíos</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">Tiempos de Entrega</h3>
                <p className="mb-2">
                  Nos esforzamos por procesar y enviar todos los pedidos lo más rápido posible. Los tiempos de entrega
                  estimados son:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ciudad de México y área metropolitana: 1-2 días hábiles</li>
                  <li>Principales ciudades: 2-3 días hábiles</li>
                  <li>Resto del país: 3-5 días hábiles</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Costos de Envío</h3>
                <p className="mb-2">
                  Los costos de envío se calculan automáticamente durante el proceso de compra, basados en la ubicación
                  de entrega y el peso total del pedido.
                </p>
                <p className="mb-2">
                  Ofrecemos envío gratuito en pedidos superiores a $999 MXN dentro de la República Mexicana.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Seguimiento de Pedidos</h3>
                <p className="mb-2">
                  Una vez que tu pedido haya sido enviado, recibirás un correo electrónico con el número de guía para
                  que puedas rastrear tu paquete en tiempo real.
                </p>
                <p>
                  También puedes verificar el estado de tu pedido iniciando sesión en tu cuenta y visitando la sección
                  "Mis Pedidos".
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Consideraciones Especiales</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No realizamos envíos los fines de semana o días festivos.</li>
                  <li>Los pedidos realizados después de las 2:00 PM serán procesados al siguiente día hábil.</li>
                  <li>En temporadas de alta demanda, los tiempos de entrega pueden extenderse ligeramente.</li>
                  <li>Actualmente solo realizamos envíos dentro de México.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Política de Devoluciones</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">Productos Elegibles para Devolución</h3>
                <p className="mb-2">Aceptamos devoluciones de productos en las siguientes condiciones:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Productos dañados o defectuosos al momento de la entrega</li>
                  <li>Productos incorrectos (diferentes a los que ordenaste)</li>
                  <li>Productos sin abrir y en su empaque original</li>
                </ul>
                <p className="mt-2">
                  Por razones de seguridad e higiene, no aceptamos devoluciones de productos alimenticios que hayan sido
                  abiertos, a menos que presenten algún defecto de fabricación.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Proceso de Devolución</h3>
                <p className="mb-2">Para iniciar una devolución, sigue estos pasos:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Contáctanos dentro de los 14 días posteriores a la recepción de tu pedido.</li>
                  <li>Proporciona tu número de pedido y el motivo de la devolución.</li>
                  <li>Nuestro equipo te enviará instrucciones detalladas y una etiqueta de devolución.</li>
                  <li>Empaca el producto en su embalaje original o en un empaque seguro.</li>
                  <li>Envía el paquete utilizando la etiqueta proporcionada.</li>
                </ol>
                <p className="mt-2">
                  Una vez que recibamos y verifiquemos el producto devuelto, procesaremos tu reembolso o reemplazo según
                  corresponda.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Reembolsos</h3>
                <p className="mb-2">Los reembolsos se procesarán de la siguiente manera:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Reembolso al método de pago original: 3-5 días hábiles</li>
                  <li>Crédito en tienda: procesamiento inmediato</li>
                </ul>
                <p className="mt-2">
                  Los costos de envío originales no son reembolsables, excepto en casos donde el producto llegue dañado
                  o sea incorrecto.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Garantía de Satisfacción</h3>
                <p>
                  Ofrecemos una garantía de satisfacción del 100%. Si tu mascota no disfruta de nuestros productos,
                  contáctanos dentro de los 30 días posteriores a la compra y te ofreceremos un reembolso o un producto
                  alternativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
