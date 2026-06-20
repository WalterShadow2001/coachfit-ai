# =============================================================================
# Localizar el APK generado y abrir la carpeta en Explorer
# Uso: .\scripts\find-apk.ps1
# =============================================================================

Write-Host ""
Write-Host "=== Buscando APK generado ===" -ForegroundColor Cyan

$apkPaths = @(
    "android\app\build\outputs\apk\debug\app-debug.apk",
    "android\app\build\outputs\apk\release\app-release.apk",
    "android\app\build\outputs\apk\release\app-release-unsigned.apk"
)

$apkFound = $null
foreach ($path in $apkPaths) {
    if (Test-Path $path) {
        $apkFound = $path
        break
    }
}

if ($apkFound) {
    $fileInfo = Get-Item $apkFound
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "[OK] APK encontrado!" -ForegroundColor Green
    $fullPath = (Resolve-Path $apkFound).Path
    Write-Host "   Ruta: $fullPath" -ForegroundColor White
    Write-Host "   Tamano: $sizeMB MB" -ForegroundColor White
    Write-Host "   Generado: $($fileInfo.LastWriteTime)" -ForegroundColor White
    Write-Host ""
    Write-Host "Abriendo carpeta en Explorer..." -ForegroundColor Cyan
    $folder = Split-Path $fullPath
    explorer.exe $folder
} else {
    Write-Host "[X] No se encontro ningun APK." -ForegroundColor Red
    Write-Host "    Posibles causas:" -ForegroundColor Yellow
    Write-Host "    1. No has generado el APK aun en Android Studio" -ForegroundColor White
    Write-Host "    2. El build fallo" -ForegroundColor White
    Write-Host ""
    Write-Host "    Pasos:" -ForegroundColor Cyan
    Write-Host "    1. Abre Android Studio: .\scripts\open-android-studio.ps1" -ForegroundColor White
    Write-Host "    2. Build -> Build Bundle(s)/APK(s) -> Build APK(s)" -ForegroundColor White
    Write-Host "    3. Espera a que termine (3-10 min)" -ForegroundColor White
    Write-Host "    4. Ejecuta este script otra vez" -ForegroundColor White
}
Write-Host ""
