# =============================================================================
# Abrir proyecto en Android Studio
# Uso: .\scripts\open-android-studio.ps1
# =============================================================================

Write-Host ""
Write-Host "=== Abriendo Android Studio ===" -ForegroundColor Cyan

# Verificar que existe la carpeta android
if (-not (Test-Path "android")) {
    Write-Host "[X] No se encontro la carpeta 'android'." -ForegroundColor Red
    Write-Host "    Ejecuta primero: .\scripts\prepare-apk.ps1" -ForegroundColor Yellow
    exit 1
}

# Buscar Android Studio
$studioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe",
    "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe"
)

$studioFound = $null
foreach ($path in $studioPaths) {
    if (Test-Path $path) {
        $studioFound = $path
        break
    }
}

if ($studioFound) {
    Write-Host "[OK] Android Studio encontrado: $studioFound" -ForegroundColor Green
    $androidPath = (Resolve-Path "android").Path
    Start-Process $studioFound -ArgumentList $androidPath
    Write-Host "[OK] Abriendo proyecto..." -ForegroundColor Green
} else {
    Write-Host "[!]  Android Studio no encontrado en ubicaciones comunes." -ForegroundColor Yellow
    Write-Host "    Abre Android Studio manualmente y selecciona la carpeta:" -ForegroundColor White
    $androidPath = (Resolve-Path "android").Path
    Write-Host "    $androidPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    O usa el comando:" -ForegroundColor White
    Write-Host "    bunx cap open android" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Una vez abierto:" -ForegroundColor Cyan
Write-Host "  Build -> Build Bundle(s)/APK(s) -> Build APK(s)" -ForegroundColor White
Write-Host ""
