import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function ThankYouPage() {
  return (
    <div className="responsive-section bg-illuminated">
      <div className="responsive-container">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <CheckCircle className="h-24 w-24 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">¡Gracias por tu compra!</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Tu pedido ha sido procesado correctamente. Hemos enviado un correo electrónico con los detalles de tu
            compra.
          </p>
          <p className="text-md text-gray-600 dark:text-gray-300 mb-12">
            Número de pedido:{" "}
            <span className="font-bold">
              PG-
              {Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, "0")}
            </span>
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-md">
            <h2 className="text-xl font-bold mb-4 text-primary font-display">¿Qué sigue?</h2>
            <ul className="text-left space-y-3">
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-3 mt-1">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <span>Recibirás un correo electrónico de confirmación con los detalles de tu pedido.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-3 mt-1">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <span>Tu pedido será preparado y enviado en las próximas 24 horas.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-3 mt-1">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <span>Recibirás otro correo con la información de seguimiento cuando tu pedido sea enviado.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full">
              <Link href="/">Volver a la Tienda</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/mi-cuenta">Ver Mis Pedidos</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
