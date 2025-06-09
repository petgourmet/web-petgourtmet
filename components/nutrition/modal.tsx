"use client"
import { useEffect } from "react"
import type React from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const modalClasses = {
  overlay: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4",
  container: "bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden",
  header: "flex justify-between items-center p-6 border-b border-gray-200",
  title: "text-2xl font-bold text-gray-900",
  closeButton: "text-gray-400 hover:text-gray-600 transition-colors",
  content: "overflow-y-auto max-h-[calc(80vh-80px)] p-6",
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={modalClasses.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={modalClasses.container}>
        <header className={modalClasses.header}>
          <h3 id="modal-title" className={modalClasses.title}>
            {title}
          </h3>
          <button onClick={onClose} className={modalClasses.closeButton} aria-label="Cerrar modal">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className={modalClasses.content}>{children}</div>
      </div>
    </div>
  )
}
