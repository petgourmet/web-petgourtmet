import { SetupProductTables } from "@/components/admin/setup-product-tables"

export default function SetupProductTablesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-2xl font-bold">Configuración de Tablas de Productos</h1>
      <div className="grid gap-6">
        <SetupProductTables />
      </div>
    </div>
  )
}
