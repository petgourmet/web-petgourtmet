import { Loader2 } from "lucide-react"

export default function OrderDetailLoading() {
  return (
    <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-lg text-gray-500">Cargando detalles del pedido...</p>
    </div>
  )
}
