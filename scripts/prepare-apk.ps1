# =============================================================================
# CoachFit AI - Preparador de APK para Windows (PowerShell)
# Uso: .\scripts\prepare-apk.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-OK { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning2 { param($msg) Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Error2 { param($msg) Write-Host "[X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=== CoachFit AI - Preparador de APK (Windows) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Paso 1: Verificando prerequisitos..." -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# Verificar Bun
# -----------------------------------------------------------------------------
$bunCmd = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bunCmd) {
    Write-Error2 "Bun no esta instalado."
    Write-Host ""
    Write-Host "Instala Bun abriendo PowerShell como Administrador y ejecutando:" -ForegroundColor Yellow
    Write-Host "  powershell -c ""irm bun.sh/install.ps1 | iex""" -ForegroundColor White
    Write-Host ""
    Write-Host "Despues CIERRA y vuelve a abrir PowerShell, y ejecuta este script otra vez."
    exit 1
}
Write-OK "Bun detectado"

# -----------------------------------------------------------------------------
# Verificar Node
# -----------------------------------------------------------------------------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error2 "Node.js no esta instalado."
    Write-Host "Descarga de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-OK "Node.js detectado"

# -----------------------------------------------------------------------------
# Verificar Git
# -----------------------------------------------------------------------------
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Error2 "Git no esta instalado."
    Write-Host "Descarga de: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}
Write-OK "Git detectado"

# -----------------------------------------------------------------------------
# Verificar package.json (si no existe, clonar repo)
# -----------------------------------------------------------------------------
if (-not (Test-Path "package.json")) {
    Write-Host ""
    Write-Host "Clonando repositorio..." -ForegroundColor Cyan
    git clone https://github.com/WalterShadow2001/coachfit-ai.git
    Set-Location "coachfit-ai"
    Write-OK "Repositorio clonado"
}

# -----------------------------------------------------------------------------
# Crear .env si no existe
# -----------------------------------------------------------------------------
Write-Host ""
if (-not (Test-Path ".env")) {
    Write-Warning2 "No se encontro archivo .env. Vamos a crearlo."
    Write-Host "Necesitas tus tokens de Turso (https://turso.tech/app):" -ForegroundColor Yellow
    Write-Host ""
    $tursoUrl = Read-Host "Pega tu TURSO_DATABASE_URL (ej: libsql://coachfit-ai-xxx.turso.io)"
    $tursoToken = Read-Host "Pega tu TURSO_AUTH_TOKEN (eyJ...)"

    # Construir el contenido linea por linea (sin heredoc)
    $lines = @(
        "DATABASE_URL=`"$tursoUrl" + "?authToken=" + "$tursoToken`"",
        "TURSO_DATABASE_URL=`"$tursoUrl`"",
        "TURSO_AUTH_TOKEN=`"$tursoToken`"",
        "ZAI_BASE_URL=`"https://internal-api.z.ai/v1`"",
        "ZAI_API_KEY=`"Z.ai`""
    )
    $envContent = $lines -join "`r`n"
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env"), $envContent, [System.Text.Encoding]::UTF8)
    Write-OK ".env creado"
} else {
    Write-OK ".env ya existe"
}

# -----------------------------------------------------------------------------
# Instalar dependencias
# -----------------------------------------------------------------------------
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Paso 2: Instalando dependencias..." -ForegroundColor Cyan
    bun install
    Write-OK "Dependencias instaladas"
} else {
    Write-OK "Dependencias ya instaladas"
}

# -----------------------------------------------------------------------------
# Instalar Capacitor y plugins
# -----------------------------------------------------------------------------
if (-not (Test-Path "node_modules/@capacitor/core")) {
    Write-Host ""
    Write-Host "Paso 3: Instalando Capacitor y plugins nativos..." -ForegroundColor Cyan
    bun add @capacitor/core @capacitor/cli @capacitor/android
    bun add @capacitor/local-notifications
    bun add @capacitor-community/geolocation
    bun add @capacitor/filesystem
    Write-OK "Capacitor y plugins instalados"
} else {
    Write-OK "Capacitor ya esta instalado"
}

# -----------------------------------------------------------------------------
# Inicializar Capacitor
# -----------------------------------------------------------------------------
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host ""
    Write-Host "Paso 4: Inicializando Capacitor..." -ForegroundColor Cyan
    bunx cap init "CoachFit AI" "com.tuempresa.coachfit" --web-dir=out
    Write-OK "Capacitor inicializado"
} else {
    Write-OK "capacitor.config.ts ya existe"
}

# -----------------------------------------------------------------------------
# Preguntar modo
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Paso 5: Seleccion de modo" -ForegroundColor Cyan
Write-Host "  1) WebView (carga web de Vercel) - RECOMENDADO, todas las funciones funcionan"
Write-Host "  2) Offline (export estatico) - funciona sin internet pero sin API routes"
$modo = Read-Host "Selecciona 1 o 2 [1]"
if ([string]::IsNullOrWhiteSpace($modo)) { $modo = "1" }

# -----------------------------------------------------------------------------
# Crear capacitor.config.ts segun el modo
# -----------------------------------------------------------------------------
if ($modo -eq "1") {
    $configLines = @(
        "import type { CapacitorConfig } from '@capacitor/cli';",
        "",
        "const config: CapacitorConfig = {",
        "  appId: 'com.tuempresa.coachfit',",
        "  appName: 'CoachFit AI',",
        "  webDir: 'out',",
        "  server: {",
        "    url: 'https://coachfit-ai-phi.vercel.app',",
        "    cleartext: true,",
        "  },",
        "  plugins: {",
        "    LocalNotifications: {",
        "      smallIcon: 'ic_notification',",
        "      iconColor: '#059669',",
        "    },",
        "  },",
        "};",
        "",
        "export default config;"
    )
    $configContent = $configLines -join "`r`n"
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) "capacitor.config.ts"), $configContent, [System.Text.Encoding]::UTF8)
    Write-OK "Configurado en modo WebView (Vercel)"

    # Crear carpeta out con redirect
    New-Item -ItemType Directory -Path "out" -Force | Out-Null
    $redirectHtml = '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=https://coachfit-ai-phi.vercel.app"></head><body>Loading CoachFit AI...</body></html>'
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) "out\index.html"), $redirectHtml, [System.Text.Encoding]::UTF8)
    Write-OK "Carpeta out/ creada"
} else {
    $configLines = @(
        "import type { CapacitorConfig } from '@capacitor/cli';",
        "",
        "const config: CapacitorConfig = {",
        "  appId: 'com.tuempresa.coachfit',",
        "  appName: 'CoachFit AI',",
        "  webDir: 'out',",
        "  plugins: {",
        "    LocalNotifications: {",
        "      smallIcon: 'ic_notification',",
        "      iconColor: '#059669',",
        "    },",
        "  },",
        "};",
        "",
        "export default config;"
    )
    $configContent = $configLines -join "`r`n"
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) "capacitor.config.ts"), $configContent, [System.Text.Encoding]::UTF8)
    Write-OK "Configurado en modo Offline"

    # Cambiar next.config.ts
    if (Test-Path "next.config.ts") {
        $nextConfig = Get-Content "next.config.ts" -Raw
        if ($nextConfig -match 'output:\s*"standalone"') {
            $nextConfig = $nextConfig -replace 'output:\s*"standalone"', 'output: "export"'
            if ($nextConfig -notmatch 'images:\s*\{') {
                $nextConfig = $nextConfig -replace 'reactStrictMode:\s*false,', "reactStrictMode: false,`r`n  images: { unoptimized: true },"
            }
            [System.IO.File]::WriteAllText((Join-Path (Get-Location) "next.config.ts"), $nextConfig, [System.Text.Encoding]::UTF8)
            Write-OK "next.config.ts cambiado a export"
        }
    }

    Write-Host ""
    Write-Host "Construyendo app web (puede tardar 1-2 min)..." -ForegroundColor Cyan
    bun run build
    Write-OK "Build completado"
}

# -----------------------------------------------------------------------------
# Agregar Android
# -----------------------------------------------------------------------------
if (-not (Test-Path "android")) {
    Write-Host ""
    Write-Host "Paso 6: Agregando plataforma Android..." -ForegroundColor Cyan
    bunx cap add android
    Write-OK "Android agregado"
} else {
    Write-OK "Android ya existe"
}

# -----------------------------------------------------------------------------
# Sincronizar
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Paso 7: Sincronizando..." -ForegroundColor Cyan
bunx cap sync
Write-OK "Sincronizacion completada"

# -----------------------------------------------------------------------------
# Configurar AndroidManifest.xml
# -----------------------------------------------------------------------------
$manifest = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
    $manifestContent = Get-Content $manifest -Raw

    if ($manifestContent -notmatch "RECORD_AUDIO") {
        Write-Host ""
        Write-Host "Paso 8: Agregando permisos al AndroidManifest..." -ForegroundColor Cyan

        # Backup
        Copy-Item $manifest "$manifest.bak"

        # Construir bloque de permisos
        $permissions = @(
            '    <uses-permission android:name="android.permission.INTERNET" />',
            '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
            '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
            '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
            '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
            '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
            '    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />',
            '    <uses-permission android:name="android.permission.BODY_SENSORS" />',
            ''
        ) -join "`r`n"

        # Insertar permisos antes de <application
        $manifestContent = $manifestContent -replace '(<application)', "$permissions`$1"

        # Agregar usesCleartextTraffic si no existe
        if ($manifestContent -notmatch 'usesCleartextTraffic') {
            $manifestContent = $manifestContent -replace '<application', '<application android:usesCleartextTraffic="true"'
        }

        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $manifest), $manifestContent, [System.Text.Encoding]::UTF8)
        Write-OK "Permisos agregados a AndroidManifest"
    } else {
        Write-OK "Permisos ya estan en AndroidManifest"
    }
}

# -----------------------------------------------------------------------------
# Verificar Android Studio
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Paso 9: Verificando Android Studio..." -ForegroundColor Cyan
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe",
    "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe"
)
$studioFound = $false
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        $studioFound = $true
        Write-OK "Android Studio detectado en: $path"
        break
    }
}
if (-not $studioFound) {
    Write-Warning2 "Android Studio no detectado en ubicaciones comunes."
    Write-Host "Si ya lo tienes instalado, ignora este mensaje." -ForegroundColor Yellow
    Write-Host "Si no lo tienes, descargalo de: https://developer.android.com/studio" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Final
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "LISTO! Ahora puedes generar el APK" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguientes pasos:" -ForegroundColor White
Write-Host ""
Write-Host "1. Asegurate de tener Android Studio instalado" -ForegroundColor White
Write-Host "   https://developer.android.com/studio" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Abre el proyecto en Android Studio:" -ForegroundColor White
Write-Host "   .\scripts\open-android-studio.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "   O manualmente:" -ForegroundColor White
Write-Host "   bunx cap open android" -ForegroundColor Gray
Write-Host ""
Write-Host "3. En Android Studio:" -ForegroundColor White
Write-Host "   Build -> Build Bundle(s)/APK(s) -> Build APK(s)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Cuando termine, busca el APK con:" -ForegroundColor White
Write-Host "   .\scripts\find-apk.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "   O manualmente en:" -ForegroundColor White
Write-Host "   android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Copia ese archivo a tu celular y abrilo para instalar" -ForegroundColor White
Write-Host ""
Write-Host "Guia completa: download\GUIA-APK-POWERSHELL.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dudas? Abre un issue en:" -ForegroundColor White
Write-Host "https://github.com/WalterShadow2001/coachfit-ai/issues" -ForegroundColor Gray
Write-Host ""
