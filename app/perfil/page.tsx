"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  User,
  LogOut,
  PawPrint,
  ShoppingBag,
  CreditCard,
  Calendar,
  Settings,
  AlertCircle,
  XCircle,
  Pause,
  Play,
  Edit,
  Trash2,
} from "lucide-react"
import { ThemedBackground } from "@/components/themed-background"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ErrorFallbackImage } from "@/components/error-fallback-image"

type ProfileTab = "personal" | "suscripciones" | "metodos-pago" | "historial-facturacion" | "compras" | "configuracion"

export default function PerfilPage() {
  const { user, signOut } = useClientAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({})

  const fetchSubscriptions = async () => {
    if (!user) return
    setLoadingSubscriptions(true)
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
        *,
        products (
          name,
          image,
          slug
        )
      `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (error) {
      console.error("Error al cargar suscripciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las suscripciones",
        variant: "destructive",
      })
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  const fetchPaymentMethods = async () => {
    if (!user) return
    setLoadingPayments(true)
    try {
      const { data, error } = await supabase
        .from("user_payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive",
      })
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchBillingHistory = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from("subscription_billing_history")
        .select(`
        *,
        user_subscriptions (
          product_name,
          subscription_type
        )
      `)
        .eq("user_id", user.id)
        .order("billing_date", { ascending: false })
        .limit(20)

      if (error) throw error
      setBillingHistory(data || [])
    } catch (error) {
      console.error("Error al cargar historial de facturación:", error)
    }
  }

  const fetchOrders = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
        *,
        order_items (
          *
        )
      `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error al cargar historial de compras:", error)
    }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error
        setProfile(data)

        // Cargar datos adicionales según la pestaña activa
        if (activeTab === "suscripciones") {
          await fetchSubscriptions()
        } else if (activeTab === "metodos-pago") {
          await fetchPaymentMethods()
        } else if (activeTab === "historial-facturacion") {
          await fetchBillingHistory()
        } else if (activeTab === "compras") {
          await fetchOrders()
        }
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

    fetchAllData()
  }, [user, toast, activeTab])

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

  const validateCardData = (formData: FormData) => {
    const errors: { [key: string]: string } = {}

    const cardNumber = (formData.get("cardNumber") as string).replace(/\s/g, "")
    if (!cardNumber || !/^\d{13,19}$/.test(cardNumber)) {
      errors.cardNumber = "Número de tarjeta inválido"
    }

    const expiryDate = formData.get("expiryDate") as string
    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      errors.expiryDate = "Fecha de expiración inválida"
    } else {
      const [month, year] = expiryDate.split("/")
      const currentYear = new Date().getFullYear() % 100
      const currentMonth = new Date().getMonth() + 1

      if (
        Number.parseInt(year) < currentYear ||
        (Number.parseInt(year) === currentYear && Number.parseInt(month) < currentMonth)
      ) {
        errors.expiryDate = "La tarjeta ha expirado"
      }

      if (Number.parseInt(month) < 1 || Number.parseInt(month) > 12) {
        errors.expiryDate = "Mes inválido"
      }
    }

    const cvv = formData.get("cvv") as string
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      errors.cvv = "CVV inválido"
    }

    const cardholderName = formData.get("cardholderName") as string
    if (!cardholderName || cardholderName.trim().length < 3) {
      errors.cardholderName = "Nombre del titular inválido"
    }

    return errors
  }

  const handleAddCard = async (formData: FormData) => {
    if (!user) return

    // Validar datos de la tarjeta
    const validationErrors = validateCardData(formData)
    if (Object.keys(validationErrors).length > 0) {
      setCardErrors(validationErrors)
      return
    }

    setCardErrors({})
    setAddingCard(true)

    try {
      const cardNumber = (formData.get("cardNumber") as string).replace(/\s/g, "")
      const expiryDate = formData.get("expiryDate") as string
      const cvv = formData.get("cvv") as string
      const cardholderName = formData.get("cardholderName") as string

      // En modo de prueba, simular la adición de tarjeta
      const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

      if (isTestMode) {
        console.log("🧪 MODO PRUEBA: Simulando adición de tarjeta")

        // Determinar la marca de la tarjeta
        const getCardBrand = (number: string) => {
          const firstDigit = number.charAt(0)
          const firstTwoDigits = number.substring(0, 2)

          if (firstDigit === "4") return "visa"
          if (["51", "52", "53", "54", "55"].includes(firstTwoDigits)) return "mastercard"
          if (["34", "37"].includes(firstTwoDigits)) return "amex"
          return "unknown"
        }

        const cardBrand = getCardBrand(cardNumber)
        const lastFourDigits = cardNumber.slice(-4)
        const [month, year] = expiryDate.split("/")

        // Verificar si es la primera tarjeta del usuario
        const { data: existingCards } = await supabase
          .from("user_payment_methods")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)

        const isFirstCard = !existingCards || existingCards.length === 0

        // Guardar en la base de datos
        const { data, error } = await supabase
          .from("user_payment_methods")
          .insert({
            user_id: user.id,
            payment_token: `test_token_${Date.now()}`,
            card_id: `test_card_${Date.now()}`,
            card_brand: cardBrand,
            card_last_four: lastFourDigits,
            card_exp_month: Number.parseInt(month),
            card_exp_year: Number.parseInt(`20${year}`),
            cardholder_name: cardholderName,
            is_default: isFirstCard,
            is_active: true,
            is_test: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) throw error

        toast({
          title: "Tarjeta agregada (Modo prueba)",
          description: "Tu método de pago ha sido agregado correctamente",
        })

        setShowAddCardModal(false)
        await fetchPaymentMethods()
        return
      }

      // Modo producción - usar la API real
      const response = await fetch("/api/payment/add-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          expiryDate,
          cvv,
          cardholderName,
          userId: user.id,
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al agregar la tarjeta")
      }

      const result = await response.json()

      toast({
        title: "Tarjeta agregada",
        description: "Tu método de pago ha sido agregado correctamente",
      })

      setShowAddCardModal(false)
      await fetchPaymentMethods() // Recargar métodos de pago
    } catch (error: any) {
      console.error("Error al agregar tarjeta:", error)
      toast({
        title: "Error al agregar tarjeta",
        description: error.message || "No se pudo agregar la tarjeta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setAddingCard(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("user_payment_methods")
        .update({ is_active: false })
        .eq("id", cardId)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Tarjeta eliminada",
        description: "El método de pago ha sido eliminado correctamente",
      })

      await fetchPaymentMethods() // Recargar métodos de pago
    } catch (error) {
      console.error("Error al eliminar tarjeta:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarjeta",
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultCard = async (cardId: string) => {
    try {
      // Primero quitar el default de todas las tarjetas
      await supabase.from("user_payment_methods").update({ is_default: false }).eq("user_id", user?.id)

      // Luego establecer la nueva tarjeta como default
      const { error } = await supabase
        .from("user_payment_methods")
        .update({ is_default: true })
        .eq("id", cardId)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Tarjeta por defecto actualizada",
        description: "Se ha establecido como método de pago principal",
      })

      await fetchPaymentMethods() // Recargar métodos de pago
    } catch (error) {
      console.error("Error al establecer tarjeta por defecto:", error)
      toast({
        title: "Error",
        description: "No se pudo establecer como tarjeta por defecto",
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
                    onClick={() => setActiveTab("suscripciones")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "suscripciones"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Calendar size={18} className="mr-2" />
                    Mis Suscripciones
                  </button>

                  <button
                    onClick={() => setActiveTab("metodos-pago")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "metodos-pago"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <CreditCard size={18} className="mr-2" />
                    Métodos de Pago
                  </button>

                  <button
                    onClick={() => setActiveTab("historial-facturacion")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "historial-facturacion"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <ShoppingBag size={18} className="mr-2" />
                    Historial de Facturación
                  </button>

                  <button
                    onClick={() => setActiveTab("compras")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "compras" ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <PawPrint size={18} className="mr-2" />
                    Mis Compras
                  </button>

                  <button
                    onClick={() => setActiveTab("configuracion")}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${
                      activeTab === "configuracion"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Settings size={18} className="mr-2" />
                    Configuración
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

                    {activeTab === "suscripciones" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Mis Suscripciones</h2>
                        {loadingSubscriptions ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : subscriptions.length === 0 ? (
                          <div className="text-center py-8">
                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                              No tienes suscripciones activas en este momento.
                            </p>
                            <button
                              onClick={() => (window.location.href = "/productos")}
                              className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                              Explorar Productos
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {subscriptions.map((subscription) => (
                              <div key={subscription.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-4">
                                    <ErrorFallbackImage
                                      src={subscription.products?.image || subscription.product_image || ""}
                                      alt={subscription.product_name || "Imagen de producto"}
                                      width={64}
                                      height={64}
                                      className="object-cover rounded-lg"
                                      fallbackSrc="/placeholder.svg?width=64&height=64"
                                    />
                                    <div>
                                      <h3 className="font-semibold">{subscription.product_name}</h3>
                                      <p className="text-sm text-gray-600">
                                        {subscription.subscription_type === "monthly" && "Mensual"}
                                        {subscription.subscription_type === "quarterly" && "Trimestral"}
                                        {subscription.subscription_type === "annual" && "Anual"}
                                        {subscription.size && ` - ${subscription.size}`}
                                      </p>
                                      <p className="text-sm text-gray-600">Cantidad: {subscription.quantity}</p>
                                      <p className="text-lg font-bold text-primary">€{subscription.discounted_price}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        subscription.status === "active"
                                          ? "bg-green-100 text-green-800"
                                          : subscription.status === "paused"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {subscription.status === "active" && "Activa"}
                                      {subscription.status === "paused" && "Pausada"}
                                      {subscription.status === "cancelled" && "Cancelada"}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>
                                      Próximo cobro: {new Date(subscription.next_billing_date).toLocaleDateString()}
                                    </span>
                                    <div className="flex space-x-2">
                                      {subscription.status === "active" && (
                                        <>
                                          <button className="flex items-center space-x-1 text-yellow-600 hover:text-yellow-700">
                                            <Pause size={16} />
                                            <span>Pausar</span>
                                          </button>
                                          <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700">
                                            <Edit size={16} />
                                            <span>Modificar</span>
                                          </button>
                                          <button className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                                            <XCircle size={16} />
                                            <span>Cancelar</span>
                                          </button>
                                        </>
                                      )}
                                      {subscription.status === "paused" && (
                                        <button className="flex items-center space-x-1 text-green-600 hover:text-green-700">
                                          <Play size={16} />
                                          <span>Reanudar</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "metodos-pago" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Métodos de Pago</h2>
                        {loadingPayments ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <p className="text-gray-600 dark:text-gray-300">
                                Gestiona tus tarjetas de crédito y métodos de pago
                              </p>
                              <Dialog open={showAddCardModal} onOpenChange={setShowAddCardModal}>
                                <DialogTrigger asChild>
                                  <button className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors">
                                    Agregar Tarjeta
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Agregar Nueva Tarjeta</DialogTitle>
                                  </DialogHeader>
                                  <form action={handleAddCard} className="space-y-4">
                                    <div>
                                      <label htmlFor="cardholderName" className="block text-sm font-medium mb-1">
                                        Nombre del Titular
                                      </label>
                                      <input
                                        id="cardholderName"
                                        name="cardholderName"
                                        type="text"
                                        required
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                          cardErrors.cardholderName ? "border-red-500" : ""
                                        }`}
                                        placeholder="Nombre como aparece en la tarjeta"
                                      />
                                      {cardErrors.cardholderName && (
                                        <p className="text-red-500 text-xs mt-1">{cardErrors.cardholderName}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label htmlFor="cardNumber" className="block text-sm font-medium mb-1">
                                        Número de Tarjeta
                                      </label>
                                      <input
                                        id="cardNumber"
                                        name="cardNumber"
                                        type="text"
                                        required
                                        maxLength={19}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                          cardErrors.cardNumber ? "border-red-500" : ""
                                        }`}
                                        placeholder="1234 5678 9012 3456"
                                        onChange={(e) => {
                                          let value = e.target.value.replace(/\s/g, "").replace(/\D/g, "")
                                          value = value.replace(/(\d{4})(?=\d)/g, "$1 ")
                                          e.target.value = value
                                        }}
                                      />
                                      {cardErrors.cardNumber && (
                                        <p className="text-red-500 text-xs mt-1">{cardErrors.cardNumber}</p>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label htmlFor="expiryDate" className="block text-sm font-medium mb-1">
                                          Fecha de Expiración
                                        </label>
                                        <input
                                          id="expiryDate"
                                          name="expiryDate"
                                          type="text"
                                          required
                                          maxLength={5}
                                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                            cardErrors.expiryDate ? "border-red-500" : ""
                                          }`}
                                          placeholder="MM/YY"
                                          onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "")
                                            if (value.length >= 2) {
                                              value = value.substring(0, 2) + "/" + value.substring(2, 4)
                                            }
                                            e.target.value = value
                                          }}
                                        />
                                        {cardErrors.expiryDate && (
                                          <p className="text-red-500 text-xs mt-1">{cardErrors.expiryDate}</p>
                                        )}
                                      </div>

                                      <div>
                                        <label htmlFor="cvv" className="block text-sm font-medium mb-1">
                                          CVV
                                        </label>
                                        <input
                                          id="cvv"
                                          name="cvv"
                                          type="text"
                                          required
                                          maxLength={4}
                                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                            cardErrors.cvv ? "border-red-500" : ""
                                          }`}
                                          placeholder="123"
                                          onChange={(e) => {
                                            e.target.value = e.target.value.replace(/\D/g, "")
                                          }}
                                        />
                                        {cardErrors.cvv && (
                                          <p className="text-red-500 text-xs mt-1">{cardErrors.cvv}</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex space-x-3 pt-4">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddCardModal(false)
                                          setCardErrors({})
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={addingCard}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                                      >
                                        {addingCard ? (
                                          <div className="flex items-center justify-center">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Agregando...
                                          </div>
                                        ) : (
                                          "Agregar Tarjeta"
                                        )}
                                      </button>
                                    </div>

                                    {process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true" && (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-xs text-yellow-700">
                                          <strong>Modo de prueba activo:</strong> Se simulará la adición de tarjeta sin
                                          procesar pagos reales.
                                        </p>
                                      </div>
                                    )}
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>

                            {paymentMethods.length === 0 ? (
                              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                  No tienes métodos de pago registrados
                                </p>
                                <Dialog open={showAddCardModal} onOpenChange={setShowAddCardModal}>
                                  <DialogTrigger asChild>
                                    <button className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors">
                                      Agregar Primera Tarjeta
                                    </button>
                                  </DialogTrigger>
                                </Dialog>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {paymentMethods.map((method) => (
                                  <div key={method.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-4">
                                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                                          <span className="text-xs font-bold uppercase">{method.card_brand}</span>
                                        </div>
                                        <div>
                                          <p className="font-medium">•••• •••• •••• {method.card_last_four}</p>
                                          <p className="text-sm text-gray-600">{method.cardholder_name}</p>
                                          <p className="text-sm text-gray-600">
                                            Expira: {method.card_exp_month}/{method.card_exp_year}
                                          </p>
                                          {method.is_test && (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                              Tarjeta de prueba
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {method.is_default && (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                            Por defecto
                                          </span>
                                        )}
                                        {!method.is_default && (
                                          <button
                                            onClick={() => handleSetDefaultCard(method.id)}
                                            className="text-blue-600 hover:text-blue-700 text-xs"
                                          >
                                            Establecer por defecto
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteCard(method.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="flex items-start space-x-3">
                                <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                                <div className="text-sm">
                                  <p className="font-medium text-blue-800 dark:text-blue-200">Seguridad de tus datos</p>
                                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                                    Tus datos de tarjeta están protegidos con encriptación de nivel bancario. Solo
                                    almacenamos tokens seguros, nunca los datos completos de tu tarjeta.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "historial-facturacion" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Historial de Facturación</h2>
                        {billingHistory.length === 0 ? (
                          <div className="text-center py-8">
                            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-300">
                              No hay historial de facturación disponible
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {billingHistory.map((billing) => (
                              <div key={billing.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{billing.user_subscriptions?.product_name}</p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(billing.billing_date).toLocaleDateString()} -
                                      {billing.user_subscriptions?.subscription_type === "monthly" &&
                                        " Suscripción Mensual"}
                                      {billing.user_subscriptions?.subscription_type === "quarterly" &&
                                        " Suscripción Trimestral"}
                                      {billing.user_subscriptions?.subscription_type === "annual" &&
                                        " Suscripción Anual"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">€{billing.amount}</p>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        billing.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : billing.status === "pending"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {billing.status === "completed" && "Completado"}
                                      {billing.status === "pending" && "Pendiente"}
                                      {billing.status === "failed" && "Fallido"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "compras" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Historial de Compras</h2>
                        {orders.length === 0 ? (
                          <div className="text-center py-8">
                            <PawPrint size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-300 mb-4">No has realizado compras aún</p>
                            <button
                              onClick={() => (window.location.href = "/productos")}
                              className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                              Explorar Productos
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {orders.map((order) => (
                              <div key={order.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-medium">Pedido #{order.order_number}</p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(order.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">€{order.total}</p>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        order.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : order.status === "pending"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {order.order_items?.map((item: any) => (
                                    <div key={item.id} className="flex items-center space-x-3 text-sm">
                                      <ErrorFallbackImage
                                        src={item.product_image || ""}
                                        alt={item.product_name || "Imagen de producto"}
                                        width={40}
                                        height={40}
                                        className="object-cover rounded"
                                        fallbackSrc="/placeholder.svg?width=40&height=40"
                                      />
                                      <span>{item.product_name}</span>
                                      <span className="text-gray-600">x{item.quantity}</span>
                                      <span className="font-medium">€{item.price}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "configuracion" && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Configuración de Cuenta</h2>
                        <div className="space-y-6">
                          <div className="border rounded-lg p-4">
                            <h3 className="font-semibold mb-3">Notificaciones</h3>
                            <div className="space-y-3">
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded" defaultChecked />
                                <span>Recordatorios de próximos cobros</span>
                              </label>
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded" defaultChecked />
                                <span>Confirmaciones de pago</span>
                              </label>
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded" defaultChecked />
                                <span>Ofertas y promociones</span>
                              </label>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4">
                            <h3 className="font-semibold mb-3">Privacidad</h3>
                            <div className="space-y-3">
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded" />
                                <span>Permitir análisis de uso</span>
                              </label>
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded" />
                                <span>Recibir recomendaciones personalizadas</span>
                              </label>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4 border-red-200">
                            <h3 className="font-semibold mb-3 text-red-600">Zona de Peligro</h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Estas acciones son permanentes y no se pueden deshacer.
                            </p>
                            <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                              Eliminar Cuenta
                            </button>
                          </div>
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
