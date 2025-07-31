#!/usr/bin/env tsx
/**
 * Script de verificación pre-producción
 * Ejecuta todas las validaciones necesarias antes del despliegue
 */

import { validateProductionConfig } from '../lib/production-config'
import { validateEnvironmentVariables } from '../lib/checkout-validators'
import { validateSecuritySetup } from '../middleware/security'
import fs from 'fs'
import path from 'path'

// Colores para la consola
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string[]
}

class PreProductionChecker {
  private results: CheckResult[] = []
  private hasErrors = false
  private hasWarnings = false

  /**
   * Ejecuta todas las verificaciones
   */
  async runAllChecks(): Promise<void> {
    console.log(`${colors.bold}${colors.blue}🔍 Iniciando verificaciones pre-producción...${colors.reset}\n`)

    // 1. Verificar variables de entorno
    this.checkEnvironmentVariables()

    // 2. Verificar configuración de producción
    this.checkProductionConfig()

    // 3. Verificar configuración de seguridad
    this.checkSecuritySetup()

    // 4. Verificar archivos críticos
    this.checkCriticalFiles()

    // 5. Verificar configuración de MercadoPago
    this.checkMercadoPagoConfig()

    // 6. Verificar configuración de Supabase
    this.checkSupabaseConfig()

    // 7. Verificar configuración de webhooks
    this.checkWebhookConfig()

    // 8. Verificar dependencias
    await this.checkDependencies()

    // 9. Verificar configuración de Next.js
    this.checkNextJsConfig()

    // Mostrar resultados
    this.displayResults()
  }

  /**
   * Verificar variables de entorno
   */
  private checkEnvironmentVariables(): void {
    const validation = validateEnvironmentVariables()
    
    if (validation.isValid) {
      this.addResult({
        name: 'Variables de Entorno',
        status: 'pass',
        message: 'Todas las variables de entorno están configuradas correctamente'
      })
    } else {
      this.addResult({
        name: 'Variables de Entorno',
        status: 'fail',
        message: 'Variables de entorno faltantes o inválidas',
        details: validation.errors
      })
    }

    if (validation.warnings && validation.warnings.length > 0) {
      this.addResult({
        name: 'Variables de Entorno - Advertencias',
        status: 'warning',
        message: 'Variables de entorno recomendadas faltantes',
        details: validation.warnings
      })
    }
  }

  /**
   * Verificar configuración de producción
   */
  private checkProductionConfig(): void {
    const validation = validateProductionConfig()
    
    if (validation.isValid) {
      this.addResult({
        name: 'Configuración de Producción',
        status: 'pass',
        message: 'Configuración de producción válida'
      })
    } else {
      this.addResult({
        name: 'Configuración de Producción',
        status: 'fail',
        message: 'Configuración de producción inválida',
        details: validation.errors
      })
    }

    if (validation.warnings.length > 0) {
      this.addResult({
        name: 'Configuración de Producción - Advertencias',
        status: 'warning',
        message: 'Configuraciones recomendadas faltantes',
        details: validation.warnings
      })
    }
  }

  /**
   * Verificar configuración de seguridad
   */
  private checkSecuritySetup(): void {
    const validation = validateSecuritySetup()
    
    if (validation.isValid) {
      this.addResult({
        name: 'Configuración de Seguridad',
        status: 'pass',
        message: 'Configuración de seguridad válida'
      })
    } else {
      this.addResult({
        name: 'Configuración de Seguridad',
        status: 'fail',
        message: 'Configuración de seguridad inválida',
        details: validation.errors
      })
    }

    if (validation.warnings.length > 0) {
      this.addResult({
        name: 'Configuración de Seguridad - Advertencias',
        status: 'warning',
        message: 'Configuraciones de seguridad recomendadas',
        details: validation.warnings
      })
    }
  }

  /**
   * Verificar archivos críticos
   */
  private checkCriticalFiles(): void {
    const criticalFiles = [
      'lib/checkout-validators.ts',
      'lib/production-config.ts',
      'middleware/security.ts',
      'components/production-checkout.tsx',
      'app/api/mercadopago/create-preference/route.ts',
      'app/api/mercadopago/webhook/route.ts',
      'lib/subscription-service.ts'
    ]

    const missingFiles: string[] = []
    
    criticalFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file)
      }
    })

    if (missingFiles.length === 0) {
      this.addResult({
        name: 'Archivos Críticos',
        status: 'pass',
        message: 'Todos los archivos críticos están presentes'
      })
    } else {
      this.addResult({
        name: 'Archivos Críticos',
        status: 'fail',
        message: 'Archivos críticos faltantes',
        details: missingFiles
      })
    }
  }

  /**
   * Verificar configuración de MercadoPago
   */
  private checkMercadoPagoConfig(): void {
    const errors: string[] = []
    const warnings: string[] = []

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      errors.push('MERCADOPAGO_ACCESS_TOKEN no configurado')
    }

    if (!process.env.MERCADOPAGO_PUBLIC_KEY) {
      errors.push('MERCADOPAGO_PUBLIC_KEY no configurado')
    }

    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        errors.push('MERCADOPAGO_WEBHOOK_SECRET es crítico en producción')
      } else {
        warnings.push('MERCADOPAGO_WEBHOOK_SECRET recomendado para webhooks seguros')
      }
    }

    // Verificar formato de tokens
    if (process.env.MERCADOPAGO_ACCESS_TOKEN && !process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('APP_USR-')) {
      warnings.push('MERCADOPAGO_ACCESS_TOKEN no parece tener el formato correcto')
    }

    if (errors.length === 0) {
      this.addResult({
        name: 'Configuración MercadoPago',
        status: warnings.length > 0 ? 'warning' : 'pass',
        message: 'Configuración de MercadoPago válida',
        details: warnings
      })
    } else {
      this.addResult({
        name: 'Configuración MercadoPago',
        status: 'fail',
        message: 'Configuración de MercadoPago inválida',
        details: errors
      })
    }
  }

  /**
   * Verificar configuración de Supabase
   */
  private checkSupabaseConfig(): void {
    const errors: string[] = []
    const warnings: string[] = []

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL no configurado')
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no configurado')
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY no configurado')
    }

    // Verificar formato de URL
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
      warnings.push('NEXT_PUBLIC_SUPABASE_URL no parece ser una URL de Supabase válida')
    }

    if (errors.length === 0) {
      this.addResult({
        name: 'Configuración Supabase',
        status: warnings.length > 0 ? 'warning' : 'pass',
        message: 'Configuración de Supabase válida',
        details: warnings
      })
    } else {
      this.addResult({
        name: 'Configuración Supabase',
        status: 'fail',
        message: 'Configuración de Supabase inválida',
        details: errors
      })
    }
  }

  /**
   * Verificar configuración de webhooks
   */
  private checkWebhookConfig(): void {
    const warnings: string[] = []

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      warnings.push('NEXT_PUBLIC_SITE_URL no configurado - necesario para URLs de webhook')
    } else {
      if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
        warnings.push('NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción')
      }
    }

    this.addResult({
      name: 'Configuración Webhooks',
      status: warnings.length > 0 ? 'warning' : 'pass',
      message: warnings.length > 0 ? 'Configuración de webhooks con advertencias' : 'Configuración de webhooks válida',
      details: warnings
    })
  }

  /**
   * Verificar dependencias
   */
  private async checkDependencies(): Promise<void> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        this.addResult({
          name: 'Dependencias',
          status: 'fail',
          message: 'package.json no encontrado'
        })
        return
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const criticalDeps = [
        '@supabase/supabase-js',
        'mercadopago',
        'next',
        'react'
      ]

      const missingDeps = criticalDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      )

      if (missingDeps.length === 0) {
        this.addResult({
          name: 'Dependencias',
          status: 'pass',
          message: 'Todas las dependencias críticas están presentes'
        })
      } else {
        this.addResult({
          name: 'Dependencias',
          status: 'fail',
          message: 'Dependencias críticas faltantes',
          details: missingDeps
        })
      }
    } catch (error) {
      this.addResult({
        name: 'Dependencias',
        status: 'fail',
        message: 'Error al verificar dependencias',
        details: [String(error)]
      })
    }
  }

  /**
   * Verificar configuración de Next.js
   */
  private checkNextJsConfig(): void {
    const warnings: string[] = []

    // Verificar next.config.js
    const nextConfigPath = path.join(process.cwd(), 'next.config.js')
    const nextConfigMjsPath = path.join(process.cwd(), 'next.config.mjs')
    
    if (!fs.existsSync(nextConfigPath) && !fs.existsSync(nextConfigMjsPath)) {
      warnings.push('next.config.js no encontrado - configuración por defecto')
    }

    // Verificar middleware.ts
    const middlewarePath = path.join(process.cwd(), 'middleware.ts')
    if (!fs.existsSync(middlewarePath)) {
      warnings.push('middleware.ts no encontrado - sin protección de rutas')
    }

    this.addResult({
      name: 'Configuración Next.js',
      status: warnings.length > 0 ? 'warning' : 'pass',
      message: warnings.length > 0 ? 'Configuración de Next.js con advertencias' : 'Configuración de Next.js válida',
      details: warnings
    })
  }

  /**
   * Agregar resultado de verificación
   */
  private addResult(result: CheckResult): void {
    this.results.push(result)
    
    if (result.status === 'fail') {
      this.hasErrors = true
    } else if (result.status === 'warning') {
      this.hasWarnings = true
    }
  }

  /**
   * Mostrar resultados de todas las verificaciones
   */
  private displayResults(): void {
    console.log(`\n${colors.bold}📋 RESULTADOS DE VERIFICACIÓN PRE-PRODUCCIÓN${colors.reset}\n`)

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      const color = result.status === 'pass' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red
      
      console.log(`${icon} ${color}${result.name}${colors.reset}: ${result.message}`)
      
      if (result.details && result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`   ${color}• ${detail}${colors.reset}`)
        })
      }
      console.log()
    })

    // Resumen final
    const passCount = this.results.filter(r => r.status === 'pass').length
    const warningCount = this.results.filter(r => r.status === 'warning').length
    const failCount = this.results.filter(r => r.status === 'fail').length

    console.log(`${colors.bold}📊 RESUMEN:${colors.reset}`)
    console.log(`${colors.green}✅ Pasaron: ${passCount}${colors.reset}`)
    console.log(`${colors.yellow}⚠️  Advertencias: ${warningCount}${colors.reset}`)
    console.log(`${colors.red}❌ Errores: ${failCount}${colors.reset}\n`)

    if (this.hasErrors) {
      console.log(`${colors.red}${colors.bold}🚫 NO LISTO PARA PRODUCCIÓN${colors.reset}`)
      console.log(`${colors.red}Corrige los errores antes del despliegue.${colors.reset}\n`)
      process.exit(1)
    } else if (this.hasWarnings) {
      console.log(`${colors.yellow}${colors.bold}⚠️  LISTO CON ADVERTENCIAS${colors.reset}`)
      console.log(`${colors.yellow}Revisa las advertencias antes del despliegue.${colors.reset}\n`)
    } else {
      console.log(`${colors.green}${colors.bold}🚀 LISTO PARA PRODUCCIÓN${colors.reset}`)
      console.log(`${colors.green}Todas las verificaciones pasaron exitosamente.${colors.reset}\n`)
    }
  }
}

// Ejecutar verificaciones si se ejecuta directamente
if (require.main === module) {
  const checker = new PreProductionChecker()
  checker.runAllChecks().catch(error => {
    console.error(`${colors.red}❌ Error durante las verificaciones:${colors.reset}`, error)
    process.exit(1)
  })
}

export { PreProductionChecker }