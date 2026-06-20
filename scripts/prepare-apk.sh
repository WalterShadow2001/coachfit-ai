#!/bin/bash
# Script para preparar el APK de CoachFit AI
# Uso: bash scripts/prepare-apk.sh

set -e

echo "🏋️ CoachFit AI - Preparador de APK"
echo "=================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Verificar prerequisitos
echo ""
echo "📋 Verificando prerequisitos..."
command -v bun >/dev/null 2>&1 || { print_error "Bun no instalado. Instala desde https://bun.sh"; exit 1; }
command -v node >/dev/null 2>&1 || { print_error "Node.js no instalado"; exit 1; }
print_step "Bun y Node.js detectados"

# Verificar .env
if [ ! -f .env ]; then
  print_warn "No se encontró .env. Vamos a crearlo."
  echo "Necesitas tus tokens de Turso."
  read -p "Pega tu TURSO_DATABASE_URL: " TURSO_URL
  read -p "Pega tu TURSO_AUTH_TOKEN: " TURSO_TOKEN

  cat > .env <<EOF
DATABASE_URL="${TURSO_URL}?authToken=${TURSO_TOKEN}"
TURSO_DATABASE_URL="${TURSO_URL}"
TURSO_AUTH_TOKEN="${TURSO_TOKEN}"
ZAI_BASE_URL="https://internal-api.z.ai/v1"
ZAI_API_KEY="Z.ai"
EOF
  print_step ".env creado"
else
  print_step ".env ya existe"
fi

# Instalar dependencias si es necesario
if [ ! -d node_modules ]; then
  echo ""
  echo "📦 Instalando dependencias..."
  bun install
  print_step "Dependencias instaladas"
else
  print_step "Dependencias ya instaladas"
fi

# Instalar Capacitor si no está
if [ ! -d node_modules/@capacitor/core ]; then
  echo ""
  echo "📱 Instalando Capacitor y plugins..."
  bun add @capacitor/core @capacitor/cli @capacitor/android
  bun add @capacitor/local-notifications @capacitor-community/geolocation @capacitor/filesystem
  print_step "Capacitor instalado"
else
  print_step "Capacitor ya instalado"
fi

# Inicializar Capacitor si no existe capacitor.config.ts
if [ ! -f capacitor.config.ts ]; then
  echo ""
  echo "⚙️  Inicializando Capacitor..."
  bunx cap init "CoachFit AI" "com.tuempresa.coachfit" --web-dir=out
  print_step "Capacitor inicializado"
else
  print_step "capacitor.config.ts ya existe"
fi

# Preguntar modo
echo ""
echo "🤔 ¿Qué modo prefieres?"
echo "  1) WebView (carga web de Vercel) - más simple, todas las funciones funcionan"
echo "  2) Offline (export estático) - funciona sin internet pero sin API routes"
read -p "Selecciona 1 o 2 [1]: " MODO
MODO=${MODO:-1}

if [ "$MODO" = "1" ]; then
  # Modo WebView
  cat > capacitor.config.ts <<'EOF'
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
EOF
  print_step "Configurado en modo WebView (Vercel)"
else
  # Modo Offline
  cat > capacitor.config.ts <<'EOF'
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
EOF
  print_step "Configurado en modo Offline"
fi

# Para modo WebView no necesitamos build local
if [ "$MODO" = "1" ]; then
  # Crear carpeta out vacía con un index.html redirect
  mkdir -p out
  cat > out/index.html <<EOF
<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0; url=https://coachfit-ai-phi.vercel.app"></head>
<body>Loading CoachFit AI...</body>
</html>
EOF
  print_step "Carpeta out/ creada"
else
  # Modo Offline: necesita build real
  # Cambiar next.config.ts
  if grep -q 'output: "standalone"' next.config.ts; then
    sed -i.bak 's/output: "standalone"/output: "export"/' next.config.ts
    print_step "next.config.ts cambiado a export"
  fi

  echo ""
  echo "🔨 Construyendo app web..."
  bun run build
  print_step "Build completado"
fi

# Agregar Android si no existe
if [ ! -d android ]; then
  echo ""
  echo "🤖 Agregando plataforma Android..."
  bunx cap add android
  print_step "Android agregado"
else
  print_step "Android ya existe"
fi

# Sincronizar
echo ""
echo "🔄 Sincronizando..."
bunx cap sync
print_step "Sincronización completada"

# Configurar AndroidManifest
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  if ! grep -q "RECORD_AUDIO" "$MANIFEST"; then
    echo ""
    echo "📝 Agregando permisos al AndroidManifest..."
    # Hacer backup
    cp "$MANIFEST" "$MANIFEST.bak"

    # Insertar permisos antes de <application
    sed -i '/<application/i\
    <uses-permission android:name="android.permission.INTERNET" />\
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\
    <uses-permission android:name="android.permission.RECORD_AUDIO" />\
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />\
    <uses-permission android:name="android.permission.BODY_SENSORS" />' "$MANIFEST"

    # Agregar cleartext traffic
    sed -i 's/<application/<application android:usesCleartextTraffic="true"/' "$MANIFEST"

    print_step "Permisos agregados"
  else
    print_step "Permisos ya están en AndroidManifest"
  fi
fi

echo ""
echo "================================================"
echo "🎉 ¡Listo para generar el APK!"
echo "================================================"
echo ""
echo "Ahora necesitas:"
echo ""
echo "1. Asegúrate de tener Android Studio instalado"
echo "   https://developer.android.com/studio"
echo ""
echo "2. Abre el proyecto en Android Studio:"
echo "   bunx cap open android"
echo ""
echo "3. En Android Studio:"
echo "   Build → Build Bundle(s)/APK(s) → Build APK(s)"
echo ""
echo "4. Cuando termine, busca el APK en:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "5. Copia ese archivo a tu celular y ábrelo para instalar"
echo ""
echo "📖 Guía completa: download/GUIA-APK-COMPLETA.md"
echo ""
echo "¿Dudas? Abre un issue en:"
echo "https://github.com/WalterShadow2001/coachfit-ai/issues"
