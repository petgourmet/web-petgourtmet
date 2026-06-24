"use client"
// ============================================================
// Hook: useCalculatorConfig
// Fetches the calculator config from /api/calculator-config
// with fallback to DEFAULT_CALCULATOR_CONFIG.
// Result is cached in module-level memory for the session.
// ============================================================

import { useState, useEffect } from "react"
import type { CalculatorConfig } from "@/lib/calculator-config-types"
import { DEFAULT_CALCULATOR_CONFIG } from "@/lib/calculator-config-types"

// Cache en memoria (persiste entre re-renders, se resetea en reload)
let cachedConfig: CalculatorConfig | null = null
let cachePromise: Promise<CalculatorConfig> | null = null

async function fetchConfig(): Promise<CalculatorConfig> {
  if (cachedConfig) return cachedConfig
  if (cachePromise) return cachePromise

  cachePromise = fetch("/api/calculator-config")
    .then((res) => {
      if (!res.ok) throw new Error("fetch failed")
      return res.json() as Promise<CalculatorConfig>
    })
    .then((data) => {
      cachedConfig = data
      return data
    })
    .catch(() => DEFAULT_CALCULATOR_CONFIG)

  return cachePromise
}

export function useCalculatorConfig() {
  const [config, setConfig] = useState<CalculatorConfig>(
    cachedConfig ?? DEFAULT_CALCULATOR_CONFIG
  )
  const [isLoading, setIsLoading] = useState(!cachedConfig)

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig)
      setIsLoading(false)
      return
    }
    let mounted = true
    setIsLoading(true)
    fetchConfig().then((cfg) => {
      if (mounted) {
        setConfig(cfg)
        setIsLoading(false)
      }
    })
    return () => { mounted = false }
  }, [])

  return { config, isLoading }
}
