"use client"

import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import Image from "next/image"
import { ShoppingBag } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-xl bg-[#f7fafb] flex items-center justify-center flex-shrink-0 border border-[#e3ecee]">
                <ShoppingBag className="w-6 h-6 text-[#2a7880]" strokeWidth={2} />
              </div>
              <div className="grid gap-1 flex-1 min-w-0">
                {title && (
                  <ToastTitle className="text-[#16313b] font-bold text-base">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-[#5d7276] text-sm">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
