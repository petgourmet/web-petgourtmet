import { TableInitializer } from "@/components/admin/table-initializer"

export default function InitializeTablesPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Inicialización de Tablas</h1>
      <TableInitializer />
    </div>
  )
}
