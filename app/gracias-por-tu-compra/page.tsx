import type React from "react"

interface Order {
  total: number
  // Add other order properties as needed
}

const GraciasPorTuCompraPage: React.FC = () => {
  // Mock order data for demonstration purposes
  const order: Order = {
    total: 123.45,
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">¡Gracias por tu compra!</h1>
      <p className="mb-4">Tu pedido ha sido procesado con éxito.</p>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Detalles del pedido:</h2>
        <p>Total del pedido: ${order.total} MXN</p>
        {/* Add more order details here */}
      </div>
      <p>Recibirás un correo electrónico con los detalles de tu pedido y la información de envío.</p>
    </div>
  )
}

export default GraciasPorTuCompraPage
