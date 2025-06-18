import EnableRLS from "@/components/admin/enable-rls"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Habilitar RLS - Admin",
  description: "Herramienta para habilitar Row Level Security en tablas de productos",
}

export default function EnableRLSPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Seguridad de Base de Datos</h1>
      <EnableRLS />
    </div>
  )
}
