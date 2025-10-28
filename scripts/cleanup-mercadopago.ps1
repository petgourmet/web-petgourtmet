# Script de Limpieza de MercadoPago
# Este script elimina TODAS las referencias y archivos relacionados con MercadoPago

Write-Host "🧹 Iniciando limpieza de MercadoPago..." -ForegroundColor Cyan

# Eliminar archivos de utilidades
Write-Host "`n📁 Eliminando utilidades..." -ForegroundColor Yellow
Remove-Item -Path "utils\extractCustomerName.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "utils\extractCustomerEmail.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "utils\external-reference-generator.ts" -Force -ErrorAction SilentlyContinue

# Eliminar servicios
Write-Host "📁 Eliminando servicios..." -ForegroundColor Yellow
Remove-Item -Path "lib\payment-sync-service.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "lib\dynamic-discount-service.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "lib\deterministic-reference.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "lib\checkout-validators.ts" -Force -ErrorAction SilentlyContinue

# Eliminar APIs de admin que dependen de MercadoPago
Write-Host "📁 Eliminando APIs de admin obsoletas..." -ForegroundColor Yellow
Remove-Item -Path "app\api\admin\subscription-cleanup" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\webhook-status" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\validate-specific-payment" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\verify-payment" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\sync-order-payment" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\sync-payments" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\sync-subscriptions" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\admin\validate-all-payments" -Recurse -Force -ErrorAction SilentlyContinue

# Eliminar APIs de suscripciones que dependen de MercadoPago
Write-Host "📁 Eliminando APIs de suscripciones obsoletas..." -ForegroundColor Yellow
Remove-Item -Path "app\api\subscriptions\activate-landing" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\subscriptions\activate" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\subscriptions\auto-assign" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\subscriptions\create-without-plan" -Recurse -Force -ErrorAction SilentlyContinue

# Eliminar cron jobs de validación de pagos de MercadoPago
Write-Host "📁 Eliminando cron jobs de MercadoPago..." -ForegroundColor Yellow
Remove-Item -Path "app\api\cron\auto-validate-payments" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app\api\cron\validate-payments" -Recurse -Force -ErrorAction SilentlyContinue

# Eliminar documentación de migración (ya no necesaria)
Write-Host "📁 Eliminando documentación de migración..." -ForegroundColor Yellow
Remove-Item -Path "MIGRACION-STRIPE.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "VARIABLES-ENTORNO-STRIPE.md" -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ Limpieza completada!" -ForegroundColor Green
Write-Host "⚠️  Recuerda:" -ForegroundColor Yellow
Write-Host "   1. Ejecutar 'pnpm install' para actualizar dependencias" -ForegroundColor White
Write-Host "   2. Revisar errores de compilación con 'pnpm build'" -ForegroundColor White
Write-Host "   3. Eliminar variables de entorno de MercadoPago en .env y Vercel" -ForegroundColor White
