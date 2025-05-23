import { FixProductTables } from "@/components/admin/fix-product-tables"

export default function FixTablesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Arreglar Tablas de Productos</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Solución de problemas con tablas</h2>

        <p className="mb-4">
          Esta herramienta arreglará los problemas de permisos con las tablas de productos en la base de datos. Esto
          solucionará errores como "permission denied for table users" al guardar imágenes, características, tamaños o
          reseñas de productos.
        </p>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-6">
          <p className="text-amber-800 font-medium">Advertencia</p>
          <p className="text-amber-700 text-sm">
            Esta operación modificará la estructura de las tablas en la base de datos. Es recomendable hacer una copia
            de seguridad antes de continuar.
          </p>
        </div>

        <FixProductTables />
      </div>
    </div>
  )
}
