'use client'

import { useState, useEffect } from 'react'
import { Receipt, Download, Eye, Calendar, CreditCard, Package } from 'lucide-react'
import { toast } from 'sonner'

interface BillingHistoryItem {
  id: string | number
  billing_date: string
  amount: number
  status: string
  order_number: string
  items: any[]
  customer_data?: any
  payment_method?: string
  invoice_url?: string
}

interface UserBillingHistoryProps {
  userId: string
  userEmail?: string
}

export default function UserBillingHistory({ userId, userEmail }: UserBillingHistoryProps) {
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<BillingHistoryItem | null>(null)

  useEffect(() => {
    if (userId || userEmail) {
      fetchBillingHistory()
    }
  }, [userId, userEmail])

  const fetchBillingHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/billing-history/user/${userId}${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`)
      const result = await response.json()
      
      if (result.success) {
        setBillingHistory(result.billingHistory || [])
      } else {
        console.warn('No se pudo cargar el historial de facturación')
      }
    } catch (error) {
      console.error('Error fetching billing history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Pagado'
      case 'processing':
        return 'Procesando'
      case 'pending':
        return 'Pendiente'
      case 'failed':
        return 'Falló'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // En el futuro, esto generará y descargará la factura
      toast.info('Generación de facturas disponible próximamente')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Error al descargar factura')
    }
  }

  const handleViewInvoice = (invoice: BillingHistoryItem) => {
    setSelectedInvoice(invoice)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-24 w-full"></div>
        ))}
      </div>
    )
  }

  if (billingHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No tienes historial de facturación
        </h3>
        <p className="text-gray-600">
          Cuando realices compras, aparecerán aquí tus facturas y recibos
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Historial de Facturación
        </h2>
        <button
          onClick={fetchBillingHistory}
          className="text-primary hover:text-primary/80 font-medium"
        >
          Actualizar
        </button>
      </div>

      <div className="space-y-4">
        {billingHistory.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900">
                    Factura #{invoice.order_number}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(invoice.billing_date).toLocaleDateString('es-MX')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="h-4 w-4" />
                    <span>${invoice.amount.toFixed(2)} MXN</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="h-4 w-4" />
                    <span>{invoice.items.length} producto{invoice.items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Resumen de productos */}
                {invoice.items.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="space-y-1">
                      {invoice.items.slice(0, 2).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.name || item.product?.name || 'Producto'}
                          </span>
                          <span className="text-gray-600">
                            {item.quantity}x ${(item.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {invoice.items.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{invoice.items.length - 2} producto{invoice.items.length - 2 !== 1 ? 's' : ''} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                <button
                  onClick={() => handleViewInvoice(invoice)}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </button>
                
                {invoice.status.toLowerCase() === 'completed' && (
                  <button
                    onClick={() => handleDownloadInvoice(invoice.id.toString())}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalle de factura */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                Detalle de Factura #{selectedInvoice.order_number}
              </h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Fecha:</span>
                  <div className="text-gray-900">
                    {new Date(selectedInvoice.billing_date).toLocaleDateString('es-MX')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                      {getStatusText(selectedInvoice.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.name || item.product?.name || 'Producto'}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {item.quantity} x ${(item.price || 0).toFixed(2)}
                        </div>
                        <div className="font-medium">
                          ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${selectedInvoice.amount.toFixed(2)} MXN</span>
                </div>
              </div>

              {/* Información del cliente */}
              {selectedInvoice.customer_data && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Información del Cliente</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    {selectedInvoice.customer_data.full_name && (
                      <div><span className="font-medium">Nombre:</span> {selectedInvoice.customer_data.full_name}</div>
                    )}
                    {selectedInvoice.customer_data.email && (
                      <div><span className="font-medium">Email:</span> {selectedInvoice.customer_data.email}</div>
                    )}
                    {selectedInvoice.customer_data.phone && (
                      <div><span className="font-medium">Teléfono:</span> {selectedInvoice.customer_data.phone}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
              {selectedInvoice.status.toLowerCase() === 'completed' && (
                <button
                  onClick={() => {
                    handleDownloadInvoice(selectedInvoice.id.toString())
                    setSelectedInvoice(null)
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Descargar Factura
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
