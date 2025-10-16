'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  Package,
  CreditCard,
  Calendar,
  User,
  Settings
} from 'lucide-react'

interface Notification {
  id: string
  type: 'subscription_created' | 'subscription_paused' | 'subscription_resumed' | 'subscription_cancelled' | 'payment_success' | 'payment_failed' | 'delivery_scheduled' | 'delivery_completed' | 'system_maintenance' | 'account_update'
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
  expires_at?: string
}

interface NotificationSystemProps {
  userId?: string
  isAdmin?: boolean
}

const NOTIFICATION_ICONS = {
  subscription_created: Package,
  subscription_paused: AlertTriangle,
  subscription_resumed: CheckCircle,
  subscription_cancelled: X,
  payment_success: CheckCircle,
  payment_failed: AlertTriangle,
  delivery_scheduled: Calendar,
  delivery_completed: CheckCircle,
  system_maintenance: Settings,
  account_update: User
}

const NOTIFICATION_COLORS = {
  subscription_created: 'text-green-600',
  subscription_paused: 'text-yellow-600',
  subscription_resumed: 'text-green-600',
  subscription_cancelled: 'text-red-600',
  payment_success: 'text-green-600',
  payment_failed: 'text-red-600',
  delivery_scheduled: 'text-blue-600',
  delivery_completed: 'text-green-600',
  system_maintenance: 'text-gray-600',
  account_update: 'text-blue-600'
}

export default function NotificationSystem({ userId, isAdmin = false }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  // Initialize notification system
  useEffect(() => {
    if (!userId && !isAdmin) return

    // Fetch initial notifications
    fetchNotifications()

    // Setup real-time connection
    setupRealtimeConnection()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [userId, isAdmin])

  const fetchNotifications = async () => {
    try {
      const endpoint = isAdmin 
        ? '/api/admin/notifications'
        : `/api/notifications/user/${userId}`
      
      const response = await fetch(endpoint)
      if (!response.ok) return

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const setupRealtimeConnection = () => {
    try {
      const endpoint = isAdmin 
        ? '/api/notifications/stream?admin=true'
        : `/api/notifications/stream?user_id=${userId}`
      
      const es = new EventSource(endpoint)
      
      es.onopen = () => {
        setIsConnected(true)
        console.log('Notification stream connected')
      }

      es.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data)
          handleNewNotification(notification)
        } catch (error) {
          console.error('Error parsing notification:', error)
        }
      }

      es.onerror = () => {
        setIsConnected(false)
        console.log('Notification stream disconnected')
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (es.readyState === EventSource.CLOSED) {
            setupRealtimeConnection()
          }
        }, 5000)
      }

      setEventSource(es)
    } catch (error) {
      console.error('Error setting up notification stream:', error)
    }
  }

  const handleNewNotification = useCallback((notification: Notification) => {
    // Add to notifications list
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)

    // Show toast notification
    showToastNotification(notification)
  }, [])

  const showToastNotification = (notification: Notification) => {
    const Icon = NOTIFICATION_ICONS[notification.type] || Bell
    const iconColor = NOTIFICATION_COLORS[notification.type] || 'text-blue-600'

    switch (notification.type) {
      case 'subscription_created':
        toast.success(notification.title, {
          description: notification.message,
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          duration: 5000,
        })
        break

      case 'subscription_paused':
      case 'subscription_cancelled':
        toast.warning(notification.title, {
          description: notification.message,
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          duration: 5000,
        })
        break

      case 'payment_success':
      case 'delivery_completed':
      case 'subscription_resumed':
        toast.success(notification.title, {
          description: notification.message,
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          duration: 4000,
        })
        break

      case 'payment_failed':
        toast.error(notification.title, {
          description: notification.message,
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
          duration: 8000,
          action: {
            label: 'Actualizar pago',
            onClick: () => handlePaymentUpdate(notification.data)
          }
        })
        break

      case 'delivery_scheduled':
        toast.info(notification.title, {
          description: notification.message,
          icon: <Calendar className="h-4 w-4 text-blue-600" />,
          duration: 6000,
        })
        break

      case 'system_maintenance':
        toast.info(notification.title, {
          description: notification.message,
          icon: <Settings className="h-4 w-4 text-gray-600" />,
          duration: 10000,
        })
        break

      default:
        toast(notification.title, {
          description: notification.message,
          icon: <Icon className={`h-4 w-4 ${iconColor}`} />,
          duration: 4000,
        })
    }
  }

  const handlePaymentUpdate = (data: any) => {
    if (data?.subscription_id) {
      // Redirect to payment update page
      window.location.href = `/subscriptions/${data.subscription_id}/payment`
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const endpoint = isAdmin 
        ? '/api/admin/notifications/read-all'
        : `/api/notifications/user/${userId}/read-all`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Update unread count if the deleted notification was unread
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Auto-cleanup expired notifications
  useEffect(() => {
    const cleanup = () => {
      const now = new Date()
      setNotifications(prev => 
        prev.filter(n => !n.expires_at || new Date(n.expires_at) > now)
      )
    }

    const interval = setInterval(cleanup, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  // Expose notification methods globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showNotification = (type: string, title: string, message: string, data?: any) => {
        const notification: Notification = {
          id: `local-${Date.now()}`,
          type: type as any,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString()
        }
        handleNewNotification(notification)
      }

      window.showSuccessNotification = (title: string, message: string) => {
        toast.success(title, {
          description: message,
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        })
      }

      window.showErrorNotification = (title: string, message: string) => {
        toast.error(title, {
          description: message,
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        })
      }

      window.showInfoNotification = (title: string, message: string) => {
        toast.info(title, {
          description: message,
          icon: <Info className="h-4 w-4 text-blue-600" />,
        })
      }

      window.showWarningNotification = (title: string, message: string) => {
        toast.warning(title, {
          description: message,
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
        })
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.showNotification
        delete window.showSuccessNotification
        delete window.showErrorNotification
        delete window.showInfoNotification
        delete window.showWarningNotification
      }
    }
  }, [handleNewNotification])

  // Component doesn't render anything visible - it's a service component
  return null
}

// Utility functions for other components to use
export const notificationUtils = {
  showSuccess: (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.showSuccessNotification) {
      window.showSuccessNotification(title, message)
    }
  },
  
  showError: (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.showErrorNotification) {
      window.showErrorNotification(title, message)
    }
  },
  
  showInfo: (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.showInfoNotification) {
      window.showInfoNotification(title, message)
    }
  },
  
  showWarning: (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.showWarningNotification) {
      window.showWarningNotification(title, message)
    }
  },
  
  showCustom: (type: string, title: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification(type, title, message, data)
    }
  }
}

// Type declarations for global window methods
declare global {
  interface Window {
    showNotification?: (type: string, title: string, message: string, data?: any) => void
    showSuccessNotification?: (title: string, message: string) => void
    showErrorNotification?: (title: string, message: string) => void
    showInfoNotification?: (title: string, message: string) => void
    showWarningNotification?: (title: string, message: string) => void
  }
}