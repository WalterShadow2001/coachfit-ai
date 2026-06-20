# =============================================================================
# Sincronizar cambios web con Android
# Uso: .\scripts\sync-android.ps1
# =============================================================================
# Ejecuta este script cada vez que cambies algo en el código web
# y quieras verlo reflejado en el APK

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔄 Sincronizando cambios con Android..." -ForegroundColor Cyan

# Verificar que existe android
if (-not (Test-Path "android")) {
    Write-Host "❌ No se encontró la carpeta 'android'." -ForegroundColor Red
    Write-Host "   Ejecuta primero: .\scripts\prepare-apk.ps1" -ForegroundColor Yellow
    exit 1
}

# Si hay cambios en el código web, hacer build primero
$nextConfig = Get-Content "next.config.ts" -Raw -ErrorAction SilentlyContinue
if ($nextConfig -match 'output:\s*"export"') {
    Write-Host "🔨 Construyendo app web..." -ForegroundColor Cyan
    bun run build
    Write-Host "✓ Build completado" -ForegroundColor Green
}

# Sincronizar
bunx cap sync
Write-Host "✓ Sincronización completada" -ForegroundColor Green

Write-Host ""
Write-Host "Ahora puedes:" -ForegroundColor Cyan
Write-Host "  - Volver a generar APK en Android Studio" -ForegroundColor White
Write-Host "  - O ejecutar la app en tu celular conectado por USB" -ForegroundColor White
Write-Host ""
