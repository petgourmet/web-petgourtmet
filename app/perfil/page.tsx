"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, User, LogOut, PawPrint, ShoppingBag, CreditCard } from "lucide-react"
import { ThemedBackground } from "@/components/themed-background"

type ProfileTab = "personal" | "mascotas" | "compras" | "suscripciones"

export default function PerfilPage() {
  const { user, signOut } = useClientAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        setProfile(data)
      } catch (error) {
        console.error("Error al cargar el perfil:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del perfil",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, toast])

  const handleUpdateProfile = async (formData: FormData) => {
    if (!user) return

    const name = formData.get("name") as string
    const phone = formData.get("phone") as string

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      // Actualizar el perfil local
      setProfile({
        ...profile,
        full_name: name,
        phone: phone,
      })

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada correctamente",
      })
    } catch (error) {
      console.error("Error al actualizar el perfil:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del perfil",
        variant: "destructive",
      })
    }
  }

  return (
    <AuthGuard>
      <ThemedBackground theme="default">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                    <User size={32} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{profile?.full_name || user?.email}</h2>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("personal")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "personal" ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <User size={18} className="mr-2" />
                    Datos Personales
                  </button>

                  <button
                    onClick={() => setActiveTab("mascotas")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "mascotas" ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <PawPrint size={18} className="mr-2" />
                    Mis Mascotas
                  </button>

                  <button
                    onClick={() => setActiveTab("compras")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "compras" ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <ShoppingBag size={18} className="mr-2" />
                    Mis Compras
                  </button>

                  <button
                    onClick={() => setActiveTab("suscripciones")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "suscripciones"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <CreditCard size={18} className="mr-2" />
                    Suscripciones
                  </button>

                  <button
                    onClick={signOut}
                    className="w-full flex items-center px-3 py-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut size={18} className="mr-2" />
                    Cerrar Sesión
                  </button>
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {activeTab === "personal" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Datos Personales</h2>
                        <form action={handleUpdateProfile} className="space-y-4">
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">
                              Nombre Completo
                            </label>
                            <input
                              id="name"
                              name="name"
                              type="text"
                              defaultValue={profile?.full_name || ""}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">
                              Correo Electrónico
                            </label>
                            <input
                              id="email"
                              type="email"
                              value={user?.email || ""}
                              disabled
                              className="w-full px-3 py-2 border rounded-md bg-gray-50 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">El correo electrónico no se puede cambiar</p>
                          </div>

                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium mb-1">
                              Teléfono
                            </label>
                            <input
                              id="phone"
                              name="phone"
                              type="tel"
                              defaultValue={profile?.phone || ""}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
                          >
                            Guardar Cambios
                          </button>
                        </form>
                      </div>
                    )}

                    {activeTab === "mascotas" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Mis Mascotas</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                          Próximamente podrás gestionar la información de tus mascotas aquí.
                        </p>
                      </div>
                    )}

                    {activeTab === "compras" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Historial de Compras</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                          Aquí podrás ver el historial de tus compras realizadas.
                        </p>
                      </div>
                    )}

                    {activeTab === "suscripciones" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Mis Suscripciones</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          Gestiona tus planes de suscripción activos.
                        </p>

                        <div className="border rounded-lg p-4 mb-4">
                          <p className="text-gray-600 dark:text-gray-300">
                            No tienes suscripciones activas en este momento.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </ThemedBackground>
    </AuthGuard>
  )
}
