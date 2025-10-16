'use client'

import React from 'react'

interface HoneypotFieldProps {
  name?: string
  value?: string
  onChange?: (value: string) => void
}

/**
 * Campo honeypot invisible para detectar bots
 * Los bots suelen llenar todos los campos, incluyendo los ocultos
 * Los usuarios reales no pueden ver ni interactuar con este campo
 */
export function HoneypotField({ 
  name = process.env.NEXT_PUBLIC_HONEYPOT_FIELD_NAME || 'website',
  value = '',
  onChange 
}: HoneypotFieldProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        visibility: 'hidden',
        opacity: 0,
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <label htmlFor={name} style={{ display: 'none' }}>
        Deja este campo vacío
      </label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        style={{
          width: '1px',
          height: '1px',
          border: 'none',
          background: 'transparent'
        }}
      />
    </div>
  )
}