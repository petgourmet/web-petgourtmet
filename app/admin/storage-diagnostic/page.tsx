"use client"

import { StorageDiagnostic } from "@/components/admin/storage-diagnostic"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function StorageDiagnosticPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center">
        <Link href="/admin/dashboard" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Diagnóstico de Supabase Storage</h1>
      </div>

      <div className="mb-6">
        <p className="text-gray-600">
          Esta página te permite diagnosticar problemas con Supabase Storage. Ejecuta el diagnóstico para verificar el
          estado de tu conexión, buckets y permisos.
        </p>
      </div>

      <StorageDiagnostic />
    </div>
  )
}
