"use client"

import Link from "next/link"
import Image from "next/image"
import { X, UserX } from "lucide-react"

interface AuthRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
}

export function AuthRequiredModal({ 
  isOpen, 
  onClose, 
  redirectTo = "/checkout" 
}: AuthRequiredModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div 
        className="rounded-2xl overflow-hidden border border-[#e6eeef] shadow-[0_4px_24px_rgba(22,49,59,0.08)] max-w-md w-full animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con logo */}
        <div className="px-5 py-4 flex items-center justify-between bg-[#16313b]">
          <div className="flex items-center gap-3">
            <Image
              src="/pet-gourmet-logo-transparent.webp"
              alt="Pet Gourmet"
              width={28}
              height={28}
              className="rounded-full object-cover opacity-90"
            />
            <span className="text-white text-sm font-semibold tracking-wide">Pet Gourmet</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="bg-white px-5 py-5">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserX className="h-5 w-5 text-[#2a7880]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#16313b] text-sm mb-1">Necesitas iniciar sesión</p>
              <p className="text-xs text-[#5d7276] leading-relaxed mb-4">
                Para completar tu compra necesitamos verificar tu identidad. Inicia sesión o crea una cuenta gratuita en segundos.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/auth/login?redirect=${redirectTo}`}
                  className="flex-1 text-center text-sm font-semibold bg-[#16313b] text-white py-2.5 px-4 rounded-full hover:bg-[#1d4a57] transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href={`/auth/register?redirect=${redirectTo}`}
                  className="flex-1 text-center text-sm font-semibold border border-[#7BBDC5]/50 text-[#2a7880] py-2.5 px-4 rounded-full hover:bg-[#f0f9fa] transition-colors"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer opcional - botón de pago seguro si es necesario */}
        <div className="bg-white px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-[#2a7880] text-white py-3 px-4 rounded-full font-semibold text-sm hover:bg-[#1d636b] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Ir al Pago Seguro
          </button>
          <p className="text-center text-[10px] text-[#7BBDC5] mt-3 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Pago 100% seguro · Procesado por Stripe · Datos cifrados
          </p>
        </div>
      </div>
    </div>
  )
}
