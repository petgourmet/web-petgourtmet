"use client"

import { StorageInitializer } from "@/components/admin/storage-initializer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function InitializeStoragePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Inicialización de Storage</h1>

      <div className="mb-6">
        <StorageInitializer />
      </div>

      <div className="flex justify-center">
        <Link href="/admin/manual-storage-setup">
          <Button variant="outline">Ver instrucciones para configuración manual</Button>
        </Link>
      </div>
    </div>
  )
}
