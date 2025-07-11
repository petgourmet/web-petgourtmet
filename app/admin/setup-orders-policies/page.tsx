import { SetupOrdersPolicies } from "@/components/admin/setup-orders-policies"

export default function SetupOrdersPoliciesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración de Políticas de Pedidos</h1>
        <p className="text-gray-600">
          Configura las políticas de Row Level Security (RLS) para solucionar problemas de creación de pedidos.
        </p>
      </div>
      <SetupOrdersPolicies />
    </div>
  )
}
