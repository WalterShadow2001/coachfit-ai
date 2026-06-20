# =============================================================================
# CoachFit AI - Preparador de APK para Windows (PowerShell)
# Uso: .\scripts\prepare-apk.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "🏋️  CoachFit AI - Preparador de APK (Windows)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# Verificar prerequisitos
# -----------------------------------------------------------------------------
Write-Host "📋 Verificando prerequisitos..." -ForegroundColor Cyan

# Bun
$bunExists = $null -ne (Get-Command bun -ErrorAction SilentlyContinue)
if (-not $bunExists) {
    Write-Err "Bun no está instalado."
    Write-Host ""
    Write-Host "Instala Bun abriendo PowerShell como Administrador y ejecutando:" -ForegroundColor Yellow
    Write-Host "  powershell -c 'irm bun.sh/install.ps1 | iex'" -ForegroundColor White
    Write-Host ""
    Write-Host "Después CIERRA y vuelve a abrir PowerShell, y ejecuta este script otra vez."
    exit 1
}
Write-Step "Bun detectado"

# Node
$nodeExists = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if (-not $nodeExists) {
    Write-Err "Node.js no está instalado."
    Write-Host "Descarga de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Step "Node.js detectado"

# Git
$gitExists = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if (-not $gitExists) {
    Write-Err "Git no está instalado."
    Write-Host "Descarga de: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}
Write-Step "Git detectado"

# -----------------------------------------------------------------------------
# Si no estamos en el directorio del proyecto, clonarlo
# -----------------------------------------------------------------------------
if (-not (Test-Path "package.json")) {
    Write-Host ""
    Write-Host "📦 Clonando repositorio..." -ForegroundColor Cyan
    git clone https://github.com/WalterShadow2001/coachfit-ai.git
    Set-Location "coachfit-ai"
    Write-Step "Repositorio clonado"
}

# -----------------------------------------------------------------------------
# .env
# -----------------------------------------------------------------------------
Write-Host ""
if (-not (Test-Path ".env")) {
    Write-Warn "No se encontró archivo .env. Vamos a crearlo."
    Write-Host "Necesitas tus tokens de Turso (https://turso.tech/app):" -ForegroundColor Yellow
    Write-Host ""
    $tursoUrl = Read-Host "Pega tu TURSO_DATABASE_URL (ej: libsql://coachfit-ai-xxx.turso.io)"
    $tursoToken = Read-Host "Pega tu TURSO_AUTH_TOKEN (eyJ...)"

    $envContent = @"
DATABASE_URL="$tursoUrl`?authToken=$tursoToken"
TURSO_DATABASE_URL="$tursoUrl"
TURSO_AUTH_TOKEN="$tursoToken"
ZAI_BASE_URL="https://internal-api.z.ai/v1"
ZAI_API_KEY="Z.ai"
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Step ".env creado"
} else {
    Write-Step ".env ya existe"
}

# -----------------------------------------------------------------------------
# Instalar dependencias
# -----------------------------------------------------------------------------
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
    bun install
    Write-Step "Dependencias instaladas"
} else {
    Write-Step "Dependencias ya instaladas"
}

# -----------------------------------------------------------------------------
# Instalar Capacitor y plugins
# -----------------------------------------------------------------------------
if (-not (Test-Path "node_modules/@capacitor/core")) {
    Write-Host ""
    Write-Host "📱 Instalando Capacitor y plugins nativos..." -ForegroundColor Cyan
    bun add @capacitor/core @capacitor/cli @capacitor/android
    bun add @capacitor/local-notifications
    bun add @capacitor-community/geolocation
    bun add @capacitor/filesystem
    Write-Step "Capacitor y plugins instalados"
} else {
    Write-Step "Capacitor ya está instalado"
}

# -----------------------------------------------------------------------------
# Inicializar Capacitor si no existe
# -----------------------------------------------------------------------------
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host ""
    Write-Host "⚙️  Inicializando Capacitor..." -ForegroundColor Cyan
    bunx cap init "CoachFit AI" "com.tuempresa.coachfit" --web-dir=out
    Write-Step "Capacitor inicializado"
} else {
    Write-Step "capacitor.config.ts ya existe"
}

# -----------------------------------------------------------------------------
# Preguntar modo
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "🤔 ¿Qué modo prefieres?" -ForegroundColor Cyan
Write-Host "  1) WebView (carga web de Vercel) - RECOMENDADO, todas las funciones funcionan"
Write-Host "  2) Offline (export estático) - funciona sin internet pero sin API routes"
$modo = Read-Host "Selecciona 1 o 2 [1]"
if ([string]::IsNullOrWhiteSpace($modo)) { $modo = "1" }

if ($modo -eq "1") {
    # Modo WebView
    $configContent = @"
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.coachfit',
  appName: 'CoachFit AI',
  webDir: 'out',
  server: {
    url: 'https://coachfit-ai-phi.vercel.app',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#059669',
    },
  },
};

export default config;
"@
    $configContent | Out-File -FilePath "capacitor.config.ts" -Encoding UTF8
    Write-Step "Configurado en modo WebView (Vercel)"

    # Crear carpeta out con redirect
    New-Item -ItemType Directory -Path "out" -Force | Out-Null
    $redirectHtml = @"
<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0; url=https://coachfit-ai-phi.vercel.app"></head>
<body>Loading CoachFit AI...</body>
</html>
"@
    $redirectHtml | Out-File -FilePath "out/index.html" -Encoding UTF8
    Write-Step "Carpeta out/ creada"
} else {
    # Modo Offline
    $configContent = @"
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.coachfit',
  appName: 'CoachFit AI',
  webDir: 'out',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#059669',
    },
  },
};

export default config;
"@
    $configContent | Out-File -FilePath "capacitor.config.ts" -Encoding UTF8
    Write-Step "Configurado en modo Offline"

    # Cambiar next.config.ts
    if (Test-Path "next.config.ts") {
        $nextConfig = Get-Content "next.config.ts" -Raw
        if ($nextConfig -match 'output:\s*"standalone"') {
            $nextConfig = $nextConfig -replace 'output:\s*"standalone"', 'output: "export"'
            # También agregar images unoptimized
            if ($nextConfig -notmatch 'images:\s*\{') {
                $nextConfig = $nextConfig -replace 'reactStrictMode:\s*false,', "reactStrictMode: false,`n  images: { unoptimized: true },"
            }
            $nextConfig | Out-File -FilePath "next.config.ts" -Encoding UTF8
            Write-Step "next.config.ts cambiado a export"
        }
    }

    Write-Host ""
    Write-Host "🔨 Construyendo app web (puede tardar 1-2 min)..." -ForegroundColor Cyan
    bun run build
    Write-Step "Build completado"
}

# -----------------------------------------------------------------------------
# Agregar Android
# -----------------------------------------------------------------------------
if (-not (Test-Path "android")) {
    Write-Host ""
    Write-Host "🤖 Agregando plataforma Android..." -ForegroundColor Cyan
    bunx cap add android
    Write-Step "Android agregado"
} else {
    Write-Step "Android ya existe"
}

# -----------------------------------------------------------------------------
# Sincronizar
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "🔄 Sincronizando..." -ForegroundColor Cyan
bunx cap sync
Write-Step "Sincronización completada"

# -----------------------------------------------------------------------------
# Configurar AndroidManifest.xml
# -----------------------------------------------------------------------------
$manifest = "android/app/src/main/AndroidManifest.xml"
if (Test-Path $manifest) {
    $manifestContent = Get-Content $manifest -Raw

    if ($manifestContent -notmatch "RECORD_AUDIO") {
        Write-Host ""
        Write-Host "📝 Agregando permisos al AndroidManifest..." -ForegroundColor Cyan

        # Backup
        Copy-Item $manifest "$manifest.bak"

        $permissions = @"
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    <uses-permission android:name="android.permission.BODY_SENSORS" />

"@

        # Insertar permisos antes de <application
        $manifestContent = $manifestContent -replace '(<application)', "$permissions`$1"

        # Agregar usesCleartextTraffic si no existe
        if ($manifestContent -notmatch 'usesCleartextTraffic') {
            $manifestContent = $manifestContent -replace '<application', '<application android:usesCleartextTraffic="true"'
        }

        $manifestContent | Out-File -FilePath $manifest -Encoding UTF8
        Write-Step "Permisos agregados a AndroidManifest"
    } else {
        Write-Step "Permisos ya están en AndroidManifest"
    }
}

# -----------------------------------------------------------------------------
# Verificar Android Studio
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "🔍 Verificando Android Studio..." -ForegroundColor Cyan
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe",
    "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe"
)
$studioFound = $false
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        $studioFound = $true
        Write-Step "Android Studio detectado en: $path"
        break
    }
}
if (-not $studioFound) {
    Write-Warn "Android Studio no detectado en ubicaciones comunes."
    Write-Host "Si ya lo tienes instalado, ignora este mensaje." -ForegroundColor Yellow
    Write-Host "Si no lo tienes, descárgalo de: https://developer.android.com/studio" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Final
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 ¡Listo para generar el APK!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora necesitas:" -ForegroundColor White
Write-Host ""
Write-Host "1. Asegúrate de tener Android Studio instalado" -ForegroundColor White
Write-Host "   https://developer.android.com/studio" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Abre el proyecto en Android Studio:" -ForegroundColor White
Write-Host "   .\scripts\open-android-studio.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "   O manualmente:" -ForegroundColor White
Write-Host "   bunx cap open android" -ForegroundColor Gray
Write-Host ""
Write-Host "3. En Android Studio:" -ForegroundColor White
Write-Host "   Build → Build Bundle(s)/APK(s) → Build APK(s)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Cuando termine, busca el APK en:" -ForegroundColor White
Write-Host "   android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Copia ese archivo a tu celular y ábrelo para instalar" -ForegroundColor White
Write-Host ""
Write-Host "📖 Guía completa: download\GUIA-APK-POWERSHELL.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "¿Dudas? Abre un issue en:" -ForegroundColor White
Write-Host "https://github.com/WalterShadow2001/coachfit-ai/issues" -ForegroundColor Gray
Write-Host ""
