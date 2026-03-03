"use client"

import { useState, useEffect } from "react"
import { Loader2, UserCheck, UserX, Shield, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { AuthGuard } from "@/components/admin/auth-guard"

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/users")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al obtener usuarios")
      }

      setUsers(data.users || [])
    } catch (error: any) {
      console.error("Error al cargar usuarios:", error)
      setError(error.message)
      toast.error(`No se pudieron cargar los usuarios: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el rol")
      }

      // Actualizar la lista de usuarios
      setUsers(users.map((user) => (user.id === userId ? { ...user, role } : user)))

      await fetchUsers()

      toast.success(`Rol de usuario actualizado a ${role}`)
    } catch (error: any) {
      console.error("Error al actualizar rol:", error)
      toast.error(`Error al actualizar rol: ${error.message}`)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Error al cargar usuarios</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={fetchUsers} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
            Intentar nuevamente
          </button>
        </div>
      )
    }

    return (
      <div className="p-3 sm:p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold">Administración de Usuarios</h1>

        <div className="rounded-md border bg-white">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Rol</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === "admin" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.confirmed_at ? (
                          <span className="inline-flex items-center text-green-600">
                            <UserCheck className="mr-1 h-4 w-4" /> Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-amber-600">
                            <UserX className="mr-1 h-4 w-4" /> No verificado
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateUserRole(user.id, "admin")}
                            disabled={user.role === "admin"}
                            className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50"
                          >
                            <Shield className="mr-1 h-3 w-3" /> Hacer Admin
                          </button>
                          <button
                            onClick={() => updateUserRole(user.id, "user")}
                            disabled={user.role === "user"}
                            className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Usuario Normal
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden">
            {users.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No se encontraron usuarios
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="p-3 border-b last:border-b-0 space-y-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate text-gray-900 pr-2">{user.email}</span>
                      <span className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${user.role === "admin" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] font-medium">
                      {user.confirmed_at ? (
                        <span className="inline-flex items-center text-green-600"><UserCheck className="mr-1 h-3.5 w-3.5" /> Verificado</span>
                      ) : (
                        <span className="inline-flex items-center text-amber-600"><UserX className="mr-1 h-3.5 w-3.5" /> No verificado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1.5 border-t border-gray-50">
                    <button onClick={() => updateUserRole(user.id, "admin")} disabled={user.role === "admin"} className="flex-1 inline-flex justify-center items-center rounded-md bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50 transition-colors">
                      <Shield className="mr-1 h-3.5 w-3.5" /> Admin
                    </button>
                    <button onClick={() => updateUserRole(user.id, "user")} disabled={user.role === "user"} className="flex-1 inline-flex justify-center items-center rounded-md bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                      Usuario
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return <AuthGuard requireAdmin={true}>{renderContent()}</AuthGuard>
}
