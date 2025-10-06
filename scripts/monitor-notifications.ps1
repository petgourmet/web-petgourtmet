# Script para iniciar el servidor y procesar notificaciones automáticamente
# Este script es útil en desarrollo cuando el cron job no está activo

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║     🔄 PROCESADOR AUTOMÁTICO DE NOTIFICACIONES 🔄             ║" -ForegroundColor Yellow
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Detectar puerto del servidor
$ports = @(3000, 3001)
$serverPort = $null

Write-Host "🔍 Buscando servidor Next.js..." -ForegroundColor Cyan

foreach($port in $ports) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $serverPort = $port
        Write-Host "✅ Servidor encontrado en puerto $port`n" -ForegroundColor Green
        break
    } catch {
        # Silencioso
    }
}

if (-not $serverPort) {
    Write-Host "❌ Servidor no encontrado." -ForegroundColor Red
    Write-Host "`nPor favor:" -ForegroundColor Yellow
    Write-Host "  1. Abre otra terminal" -ForegroundColor White
    Write-Host "  2. Ejecuta: npm run dev" -ForegroundColor Cyan
    Write-Host "  3. Vuelve a ejecutar este script`n" -ForegroundColor White
    exit 1
}

# URL del endpoint
$endpoint = "http://localhost:$serverPort/api/admin/subscription-notifications"

Write-Host "📊 Verificando notificaciones pendientes...`n" -ForegroundColor Cyan

# Verificar estado inicial
try {
    $statusResponse = Invoke-WebRequest -Uri $endpoint -Method GET -UseBasicParsing
    $status = $statusResponse.Content | ConvertFrom-Json
    
    Write-Host "Estado actual:" -ForegroundColor Yellow
    Write-Host "  Total: $($status.stats.total)" -ForegroundColor White
    Write-Host "  Pendientes: $($status.stats.pending)" -ForegroundColor $(if($status.stats.pending -gt 0){'Yellow'}else{'Green'})
    Write-Host "  Enviadas: $($status.stats.sent)" -ForegroundColor Green
    Write-Host "  Fallidas: $($status.stats.failed)`n" -ForegroundColor Red
    
    if ($status.stats.pending -eq 0) {
        Write-Host "✅ No hay notificaciones pendientes`n" -ForegroundColor Green
        Write-Host "💡 El script continuará monitoreando cada 30 segundos..." -ForegroundColor Cyan
        Write-Host "   Presiona Ctrl+C para detener`n" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Error verificando estado: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Loop infinito procesando cada 30 segundos
$iteration = 0
Write-Host "🔄 Iniciando monitoreo automático...`n" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

while ($true) {
    $iteration++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    try {
        # Obtener estado actual
        $statusResponse = Invoke-WebRequest -Uri $endpoint -Method GET -UseBasicParsing
        $status = $statusResponse.Content | ConvertFrom-Json
        
        if ($status.stats.pending -gt 0) {
            Write-Host "[$timestamp] 📧 Encontradas $($status.stats.pending) notificaciones pendientes" -ForegroundColor Yellow
            Write-Host "[$timestamp] 🔄 Procesando..." -ForegroundColor Cyan
            
            # Procesar notificaciones
            $processResponse = Invoke-WebRequest -Uri $endpoint -Method POST -UseBasicParsing
            $result = $processResponse.Content | ConvertFrom-Json
            
            if ($result.results.success -gt 0) {
                Write-Host "[$timestamp] ✅ $($result.results.success) email(s) enviado(s) exitosamente" -ForegroundColor Green
            }
            
            if ($result.results.failed -gt 0) {
                Write-Host "[$timestamp] ❌ $($result.results.failed) email(s) fallaron" -ForegroundColor Red
                foreach($error in $result.results.errors) {
                    Write-Host "         Error en notificación #$($error.notification_id): $($error.error)" -ForegroundColor Red
                }
            }
            
            Write-Host ""
        } else {
            # Solo mostrar cada 10 iteraciones si no hay pendientes
            if ($iteration % 10 -eq 0) {
                Write-Host "[$timestamp] ✓ Sin notificaciones pendientes (iteración $iteration)" -ForegroundColor DarkGray
            }
        }
        
    } catch {
        Write-Host "[$timestamp] ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "         Reintentando en 30 segundos...`n" -ForegroundColor Gray
    }
    
    # Esperar 30 segundos
    Start-Sleep -Seconds 30
}
