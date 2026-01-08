"use client"

import { useMemo } from "react"
import { Check, X, AlertCircle } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
  confirmPassword?: string
  showRequirements?: boolean
}

interface PasswordRequirement {
  label: string
  validator: (password: string) => boolean
  priority: 'required' | 'recommended'
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: "Mínimo 6 caracteres",
    validator: (password) => password.length >= 6,
    priority: 'required'
  },
  {
    label: "Al menos una mayúscula",
    validator: (password) => /[A-Z]/.test(password),
    priority: 'recommended'
  },
  {
    label: "Al menos una minúscula",
    validator: (password) => /[a-z]/.test(password),
    priority: 'recommended'
  },
  {
    label: "Al menos un número",
    validator: (password) => /[0-9]/.test(password),
    priority: 'recommended'
  },
  {
    label: "Al menos un símbolo (!@#$%...)",
    validator: (password) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password),
    priority: 'recommended'
  }
]

export function PasswordStrengthIndicator({ 
  password, 
  confirmPassword,
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const analysis = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "",
        color: "bg-gray-200",
        textColor: "text-gray-500",
        requirements: PASSWORD_REQUIREMENTS.map(req => ({
          ...req,
          passed: false
        }))
      }
    }

    const requirements = PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      passed: req.validator(password)
    }))

    const requiredPassed = requirements.filter(r => r.priority === 'required' && r.passed).length
    const recommendedPassed = requirements.filter(r => r.priority === 'recommended' && r.passed).length
    const totalRequired = requirements.filter(r => r.priority === 'required').length
    const totalRecommended = requirements.filter(r => r.priority === 'recommended').length

    // Calcular score (0-100)
    let score = 0
    
    // Los requisitos requeridos valen 50% del score total
    score += (requiredPassed / totalRequired) * 50
    
    // Los requisitos recomendados valen el otro 50%
    score += (recommendedPassed / totalRecommended) * 50

    // Bonus por longitud extra
    if (password.length >= 12) score = Math.min(100, score + 10)
    if (password.length >= 16) score = Math.min(100, score + 10)

    let label: string
    let color: string
    let textColor: string

    if (score < 30) {
      label = "Muy débil"
      color = "bg-red-500"
      textColor = "text-red-600"
    } else if (score < 50) {
      label = "Débil"
      color = "bg-orange-500"
      textColor = "text-orange-600"
    } else if (score < 70) {
      label = "Aceptable"
      color = "bg-yellow-500"
      textColor = "text-yellow-600"
    } else if (score < 90) {
      label = "Buena"
      color = "bg-green-500"
      textColor = "text-green-600"
    } else {
      label = "Excelente"
      color = "bg-emerald-500"
      textColor = "text-emerald-600"
    }

    return {
      score,
      label,
      color,
      textColor,
      requirements
    }
  }, [password])

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null
    return password === confirmPassword
  }, [password, confirmPassword])

  // No mostrar nada si no hay contraseña
  if (!password) return null

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600 dark:text-gray-400">Fortaleza de la contraseña:</span>
          <span className={`font-medium ${analysis.textColor}`}>{analysis.label}</span>
        </div>
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${analysis.color}`}
            style={{ width: `${analysis.score}%` }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      {showRequirements && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Tu contraseña debe tener:
          </p>
          {analysis.requirements.map((req, index) => (
            <div 
              key={index}
              className={`flex items-center gap-2 text-xs transition-colors ${
                req.passed 
                  ? 'text-green-600 dark:text-green-400' 
                  : req.priority === 'required'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {req.passed ? (
                <Check size={14} className="flex-shrink-0" />
              ) : req.priority === 'required' ? (
                <X size={14} className="flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />
              )}
              <span>{req.label}</span>
              {req.priority === 'required' && !req.passed && (
                <span className="text-red-500 text-[10px]">(requerido)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Indicador de coincidencia de contraseñas */}
      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
          passwordsMatch 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {passwordsMatch ? (
            <>
              <Check size={14} />
              <span>Las contraseñas coinciden</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} />
              <span>Las contraseñas no coinciden</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
