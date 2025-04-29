import { ThemedBackground } from "@/components/themed-background"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FaqPage() {
  return (
    <ThemedBackground theme="default">
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-center mb-12">Preguntas Frecuentes</h1>

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6">Sobre Nuestros Productos</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Qué hace que los productos de Pet Gourmet sean especiales?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Nuestros productos están elaborados con ingredientes 100% naturales, sin conservantes artificiales ni
                  aditivos. Utilizamos técnicas de cocción que preservan los nutrientes y el sabor, asegurando que tu
                  mascota reciba una alimentación de calidad premium.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Son seguros los productos para todas las razas y tamaños?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Sí, nuestros productos están diseñados para ser seguros para todas las razas y tamaños de perros. Sin
                  embargo, siempre recomendamos consultar con tu veterinario antes de cambiar la dieta de tu mascota,
                  especialmente si tiene necesidades dietéticas específicas.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Cuánto tiempo duran los productos una vez abiertos?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Nuestros productos frescos deben consumirse dentro de los 5 días posteriores a la apertura si se
                  mantienen refrigerados. Los productos secos, como las galletas y premios, pueden durar hasta 30 días
                  en un recipiente hermético a temperatura ambiente.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6">Pedidos y Envíos</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-4" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Cuánto tiempo tarda en llegar mi pedido?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Los tiempos de entrega varían según tu ubicación. En general, los pedidos se entregan en 1-3 días
                  hábiles en zonas metropolitanas y 3-5 días hábiles en otras áreas. Recibirás un número de seguimiento
                  para rastrear tu pedido.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Puedo modificar o cancelar mi pedido?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Puedes modificar o cancelar tu pedido dentro de las primeras 2 horas después de realizarlo. Para
                  hacerlo, contáctanos por correo electrónico o teléfono con tu número de pedido.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Ofrecen envío internacional?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Actualmente solo realizamos envíos dentro de México. Estamos trabajando para expandir nuestros
                  servicios a otros países en el futuro.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6">Pagos y Facturación</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-7" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Qué métodos de pago aceptan?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PayPal, y transferencias
                  bancarias. Todos nuestros métodos de pago son seguros y están encriptados.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Cómo puedo solicitar una factura?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Puedes solicitar una factura durante el proceso de compra marcando la opción correspondiente y
                  proporcionando tus datos fiscales. También puedes solicitarla posteriormente enviando un correo a
                  facturas@petgourmet.mx con tu número de pedido y datos fiscales.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Ofrecen descuentos por compras al mayoreo?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Sí, ofrecemos descuentos especiales para compras al mayoreo. Contáctanos a ventas@petgourmet.mx para
                  obtener más información sobre nuestros precios para distribuidores y tiendas.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Devoluciones y Garantías</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-10" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Cuál es su política de devoluciones?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Aceptamos devoluciones dentro de los 14 días posteriores a la recepción del producto si este llega
                  dañado o no cumple con las especificaciones. Los productos alimenticios abiertos no son elegibles para
                  devolución por razones de seguridad e higiene.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Qué hago si mi producto llega dañado?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Si tu producto llega dañado, toma una foto del empaque y del producto, y contáctanos dentro de las 48
                  horas posteriores a la recepción. Te enviaremos un reemplazo o te ofreceremos un reembolso completo.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-12" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                  ¿Ofrecen garantía de satisfacción?
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 bg-gray-50/50">
                  Sí, ofrecemos una garantía de satisfacción del 100%. Si tu mascota no disfruta de nuestros productos,
                  contáctanos dentro de los 30 días posteriores a la compra y te ofreceremos un reembolso o un producto
                  alternativo.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
