# Script para aplicar la migración de notificaciones de suscripciones

Write-Host "🚀 Aplicando migración de notificaciones de suscripciones..." -ForegroundColor Cyan

# Verificar que el archivo de migración existe
$migrationFile = ".\supabase\migrations\20250106_subscription_notifications.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo de migración: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Archivo de migración encontrado: $migrationFile" -ForegroundColor Green

# Opción 1: Aplicar vía Supabase CLI
Write-Host "`n🔧 Para aplicar esta migración, puedes usar una de estas opciones:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opción 1 - Supabase CLI (recomendado):" -ForegroundColor White
Write-Host "  supabase db push" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opción 2 - SQL Editor en Supabase Dashboard:" -ForegroundColor White
Write-Host "  1. Abre tu proyecto en: https://app.supabase.com" -ForegroundColor Cyan
Write-Host "  2. Ve a SQL Editor" -ForegroundColor Cyan
Write-Host "  3. Copia y pega el contenido del archivo: $migrationFile" -ForegroundColor Cyan
Write-Host "  4. Ejecuta el SQL" -ForegroundColor Cyan
Write-Host ""

# Mostrar el contenido de la migración
Write-Host "📄 Contenido de la migración:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Get-Content $migrationFile | Select-Object -First 50
Write-Host "... (ver archivo completo para más detalles)" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Información sobre el cron job
Write-Host "⏰ Configurar Cron Job (opcional pero recomendado):" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para procesar automáticamente las notificaciones, puedes configurar un cron job:" -ForegroundColor White
Write-Host ""
Write-Host "Opción A - Vercel Cron Jobs (si usas Vercel):" -ForegroundColor White
Write-Host "  Agrega esto a tu vercel.json:" -ForegroundColor Cyan
Write-Host '  {
    "crons": [{
      "path": "/api/admin/subscription-notifications",
      "schedule": "*/5 * * * *"
    }]
  }' -ForegroundColor DarkGray
Write-Host ""
Write-Host "Opción B - Cron externo (cron-job.org, EasyCron, etc.):" -ForegroundColor White
Write-Host "  URL: https://tu-dominio.com/api/admin/subscription-notifications" -ForegroundColor Cyan
Write-Host "  Método: POST" -ForegroundColor Cyan
Write-Host "  Frecuencia: Cada 5 minutos (*/5 * * * *)" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Script completado. Sigue las instrucciones anteriores para aplicar la migración." -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentación adicional:" -ForegroundColor Yellow
Write-Host "  - Endpoint API: /api/admin/subscription-notifications" -ForegroundColor White
Write-Host "  - GET: Ver estadísticas de notificaciones" -ForegroundColor White
Write-Host "  - POST: Procesar notificaciones pendientes" -ForegroundColor White
Write-Host ""
