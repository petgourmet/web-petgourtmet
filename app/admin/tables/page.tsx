import { TableCreator } from "@/components/admin/table-creator"

export default function TablesPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Administración de Tablas</h1>
      <div className="max-w-2xl">
        <TableCreator />
      </div>
    </div>
  )
}
