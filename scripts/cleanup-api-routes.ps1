# Script para eliminar TODAS las rutas API que dependen de MercadoPago
Write-Host "🧹 Eliminando rutas API de MercadoPago..." -ForegroundColor Cyan

$foldersToDelete = @(
    "app\api\admin\activate-subscription",
    "app\api\admin\cleanup-subscriptions",
    "app\api\admin\confirm-payment",
    "app\api\admin\delete-duplicate-subscription",
    "app\api\admin\sync-order-payment",
    "app\api\admin\upcoming-payments",
    "app\api\admin\validate-all-payments",
    "app\api\admin\validate-specific-payment",
    "app\api\admin\verify-payment",
    "app\api\admin\webhook-status",
    "app\api\admin\testing",
    "app\api\billing-history",
    "app\api\checkout",
    "app\api\cron\validate-payments",
    "app\api\orders\by-payment",
    "app\api\orders\[id]\validate",
    "app\api\subscription-urls",
    "app\api\subscriptions\auto-activate",
    "app\api\subscriptions\force-activate",
    "app\api\subscriptions\sync",
    "app\api\subscriptions\user",
    "app\api\subscriptions\validate-payment",
    "app\api\subscriptions\verify-return",
    "app\api\subscriptions\verify-status",
    "app\api\subscriptions\webhook",
    "app\api\subscriptions\webhook-backup",
    "app\api\test",
    "app\api\test-order",
    "app\api\test-webhook"
)

$deletedCount = 0

foreach ($folder in $foldersToDelete) {
    $fullPath = Join-Path $PSScriptRoot "..\$folder"
    if (Test-Path $fullPath) {
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Eliminado: $folder" -ForegroundColor Green
        $deletedCount++
    } else {
        Write-Host "   ⏭️  No existe: $folder" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Limpieza completada: $deletedCount folders eliminados" -ForegroundColor Cyan
Write-Host "Proximo paso: Ejecutar pnpm build para verificar" -ForegroundColor White
