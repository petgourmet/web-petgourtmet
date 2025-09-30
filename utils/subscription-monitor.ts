import { supabase } from '@/lib/supabase/client'
import { logger, LogCategory } from '@/lib/logger'
import { runSubscriptionDiagnostics, applyAutomaticFixes } from './subscription-diagnostics'

interface MonitoringConfig {
  enabled: boolean
  intervalMinutes: number
  autoFixEnabled: boolean
  alertThreshold: number
  maxIssuesPerRun: number
}

interface MonitoringResult {
  timestamp: string
  usersScanned: number
  issuesFound: number
  fixesApplied: number
  errors: string[]
  summary: string
}

class SubscriptionMonitor {
  private config: MonitoringConfig = {
    enabled: true,
    intervalMinutes: 30, // Monitoreo cada 30 minutos
    autoFixEnabled: true,
    alertThreshold: 5, // Alertar si hay más de 5 problemas
    maxIssuesPerRun: 20 // Máximo 20 problemas por ejecución
  }

  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  /**
   * Inicia el monitoreo automático
   */
  start(): void {
    if (this.isRunning) {
      console.log('🔍 Monitor de suscripciones ya está ejecutándose')
      return
    }

    if (!this.config.enabled) {
      console.log('🔍 Monitor de suscripciones está deshabilitado')
      return
    }

    console.log(`🔍 Iniciando monitor de suscripciones (intervalo: ${this.config.intervalMinutes} minutos)`)
    this.isRunning = true

    // Ejecutar inmediatamente
    this.runMonitoringCycle()

    // Programar ejecuciones periódicas
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle()
    }, this.config.intervalMinutes * 60 * 1000)

    logger.info(LogCategory.SUBSCRIPTION, 'Monitor de suscripciones iniciado', {
      intervalMinutes: this.config.intervalMinutes,
      autoFixEnabled: this.config.autoFixEnabled
    })
  }

  /**
   * Detiene el monitoreo automático
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    console.log('🔍 Deteniendo monitor de suscripciones')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Monitor de suscripciones detenido')
  }

  /**
   * Ejecuta un ciclo completo de monitoreo
   */
  private async runMonitoringCycle(): Promise<MonitoringResult> {
    const startTime = new Date()
    const result: MonitoringResult = {
      timestamp: startTime.toISOString(),
      usersScanned: 0,
      issuesFound: 0,
      fixesApplied: 0,
      errors: [],
      summary: ''
    }

    try {
      console.log('🔍 Iniciando ciclo de monitoreo de suscripciones...')

      // Obtener usuarios con suscripciones activas o pendientes
      const { data: users, error: usersError } = await supabase
        .from('unified_subscriptions')
        .select('user_id')
        .in('status', ['active', 'pending'])
        .not('user_id', 'is', null)

      if (usersError) {
        throw new Error(`Error obteniendo usuarios: ${usersError.message}`)
      }

      if (!users || users.length === 0) {
        result.summary = 'No se encontraron usuarios con suscripciones'
        return result
      }

      // Obtener IDs únicos de usuarios
      const uniqueUserIds = [...new Set(users.map(u => u.user_id))]
      result.usersScanned = uniqueUserIds.length

      console.log(`🔍 Escaneando ${uniqueUserIds.length} usuarios...`)

      let totalIssuesProcessed = 0

      // Procesar cada usuario
      for (const userId of uniqueUserIds) {
        if (totalIssuesProcessed >= this.config.maxIssuesPerRun) {
          console.log(`⚠️ Límite de problemas por ejecución alcanzado (${this.config.maxIssuesPerRun})`)
          break
        }

        try {
          // Ejecutar diagnóstico para el usuario
          const diagnosticResult = await runSubscriptionDiagnostics(userId)
          
          // Verificar que diagnosticResult y diagnosticResult.issues existan y sean arrays
          if (diagnosticResult && Array.isArray(diagnosticResult.issues) && diagnosticResult.issues.length > 0) {
            result.issuesFound += diagnosticResult.issues.length
            totalIssuesProcessed += diagnosticResult.issues.length

            console.log(`⚠️ Usuario ${userId}: ${diagnosticResult.issues.length} problemas detectados`)

            // Aplicar correcciones automáticas si está habilitado
            if (this.config.autoFixEnabled) {
              try {
                const fixResult = await applyAutomaticFixes(userId, diagnosticResult)
                
                // Verificar que fixResult existe antes de acceder a sus propiedades
                if (fixResult && typeof fixResult.fixed === 'number') {
                  result.fixesApplied += fixResult.fixed

                  if (fixResult.fixed > 0) {
                    console.log(`✅ Usuario ${userId}: ${fixResult.fixed} correcciones aplicadas`)
                    
                    logger.info(LogCategory.SUBSCRIPTION, 'Correcciones automáticas aplicadas por monitor', {
                      userId,
                      fixesApplied: fixResult.fixed,
                      errors: fixResult.errors || []
                    })
                  }
                }
              } catch (fixError) {
                const errorMsg = `Error aplicando correcciones para usuario ${userId}: ${fixError}`
                result.errors.push(errorMsg)
                console.error('❌', errorMsg)
              }
            }
          } else {
            // Log cuando no hay problemas o el resultado es inválido
            console.log(`✅ Usuario ${userId}: Sin problemas detectados o resultado inválido`)
          }
        } catch (userError) {
          const errorMsg = `Error procesando usuario ${userId}: ${userError}`
          result.errors.push(errorMsg)
          console.error('❌', errorMsg)
        }
      }

      // Generar resumen
      const duration = Date.now() - startTime.getTime()
      result.summary = `Monitoreo completado: ${result.usersScanned} usuarios, ${result.issuesFound} problemas, ${result.fixesApplied} correcciones (${duration}ms)`

      console.log('✅', result.summary)

      // Alertar si hay muchos problemas
      if (result.issuesFound >= this.config.alertThreshold) {
        logger.warn(LogCategory.SUBSCRIPTION, 'Alerta: Alto número de problemas detectados', {
          issuesFound: result.issuesFound,
          threshold: this.config.alertThreshold,
          usersScanned: result.usersScanned
        })
      }

      // Log del resultado del monitoreo
      logger.info(LogCategory.SUBSCRIPTION, 'Ciclo de monitoreo completado', {
        usersScanned: result.usersScanned,
        issuesFound: result.issuesFound,
        fixesApplied: result.fixesApplied,
        duration: `${duration}ms`,
        errors: result.errors.length
      })

    } catch (error) {
      const errorMsg = `Error en ciclo de monitoreo: ${error}`
      result.errors.push(errorMsg)
      result.summary = errorMsg
      console.error('❌', errorMsg)
      
      logger.error(LogCategory.SUBSCRIPTION, 'Error en monitoreo automático', {
        error: error,
        timestamp: result.timestamp
      })
    }

    return result
  }

  /**
   * Ejecuta un monitoreo manual (una sola vez)
   */
  async runManualCheck(): Promise<MonitoringResult> {
    console.log('🔍 Ejecutando monitoreo manual...')
    return await this.runMonitoringCycle()
  }

  /**
   * Actualiza la configuración del monitor
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    logger.info(LogCategory.SUBSCRIPTION, 'Configuración del monitor actualizada', {
      config: this.config
    })

    // Reiniciar si está ejecutándose y cambió el intervalo
    if (this.isRunning && newConfig.intervalMinutes) {
      this.stop()
      this.start()
    }
  }

  /**
   * Obtiene el estado actual del monitor
   */
  getStatus(): { isRunning: boolean; config: MonitoringConfig } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config }
    }
  }
}

// Instancia singleton del monitor
export const subscriptionMonitor = new SubscriptionMonitor()

// Funciones de utilidad para usar en componentes
export const startSubscriptionMonitoring = () => subscriptionMonitor.start()
export const stopSubscriptionMonitoring = () => subscriptionMonitor.stop()
export const runManualSubscriptionCheck = () => subscriptionMonitor.runManualCheck()
export const updateMonitoringConfig = (config: Partial<MonitoringConfig>) => subscriptionMonitor.updateConfig(config)
export const getMonitoringStatus = () => subscriptionMonitor.getStatus()

// Tipos exportados
export type { MonitoringConfig, MonitoringResult }