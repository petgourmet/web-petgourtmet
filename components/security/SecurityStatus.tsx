'use client'

import React from 'react'
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

interface SecurityStatusProps {
  isValidating?: boolean
  isValid?: boolean
  errors?: string[]
  recaptchaScore?: number
  className?: string
}

export function SecurityStatus({ 
  isValidating = false,
  isValid,
  errors = [],
  recaptchaScore,
  className = ''
}: SecurityStatusProps) {
  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 text-blue-600 ${className}`}>
        <Shield className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Verificando seguridad...</span>
      </div>
    )
  }

  if (isValid === undefined) {
    return null
  }

  if (isValid) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <ShieldCheck className="w-4 h-4" />
        <span className="text-sm">
          Verificación completada
          {recaptchaScore && (
            <span className="ml-1 text-xs opacity-75">
              (Score: {(recaptchaScore * 100).toFixed(0)}%)
            </span>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2 text-red-600">
        <ShieldX className="w-4 h-4" />
        <span className="text-sm">Verificación fallida</span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-red-500 ml-6 space-y-1">
          {errors.map((error, index) => (
            <li key={index}>• {error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SecurityBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical'
  className?: string
}

export function SecurityBadge({ level, className = '' }: SecurityBadgeProps) {
  const configs = {
    low: {
      icon: ShieldCheck,
      color: 'text-green-600 bg-green-50 border-green-200',
      label: 'Seguro'
    },
    medium: {
      icon: Shield,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      label: 'Moderado'
    },
    high: {
      icon: ShieldAlert,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      label: 'Alto riesgo'
    },
    critical: {
      icon: ShieldX,
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Crítico'
    }
  }

  const config = configs[level]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${config.color} ${className}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  )
}