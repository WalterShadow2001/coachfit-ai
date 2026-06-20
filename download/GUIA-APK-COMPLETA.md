# 📱 Guía Completa: Cómo convertir CoachFit AI en APK

Tu app ya está en GitHub (https://github.com/WalterShadow2001/coachfit-ai) y funcionando en Vercel (https://coachfit-ai-phi.vercel.app). Esta guía te lleva paso a paso para tener un APK instalable en tu Android.

---

## 📋 Requisitos previos

Antes de empezar necesitas instalar en tu computadora:

### 1. Node.js 20+ (LTS)
- Descarga de: https://nodejs.org/
- Verifica: `node --version` debe decir v20.x o superior

### 2. Bun (gestor de paquetes rápido)
```bash
# Windows (PowerShell):
irm bun.sh/install.ps1 | iex

# Mac/Linux:
curl -fsSL https://bun.sh/install | bash

# Verifica:
bun --version
```

### 3. Android Studio
- Descarga de: https://developer.android.com/studio
- Instala con todas las opciones por defecto
- **Importante**: Acepta instalar el Android SDK cuando lo pida
- Necesitas ~5 GB de espacio libre

### 4. JDK 17 (Java Development Kit)
- Android Studio ya lo incluye, pero si te pide JDK:
- Descarga de: https://adoptium.net/temurin/releases/?version=17

### 5. Git
- Si no lo tienes: https://git-scm.com/

---

## 🚀 Pasos para generar el APK

### PASO 1: Clonar el repositorio

Abre una terminal (CMD, PowerShell, o Terminal) y ejecuta:

```bash
# Clonar el repo
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai

# Instalar dependencias
bun install
```

### PASO 2: Crear archivo `.env` con tus credenciales

Crea un archivo llamado `.env` en la raíz del proyecto con estas variables (cópialas de tu cuenta de Turso):

```bash
# Base de datos Turso (cópialo de tu dashboard de Turso)
DATABASE_URL="libsql://coachfit-ai-shadowwolfsubs.aws-us-east-1.turso.io?authToken=TU_TOKEN_AQUI"
TURSO_DATABASE_URL="libsql://coachfit-ai-shadowwolfsubs.aws-us-east-1.turso.io"
TURSO_AUTH_TOKEN="TU_TOKEN_AQUI"

# Z.ai (no necesario para APK, pero recomendado)
ZAI_BASE_URL="https://internal-api.z.ai/v1"
ZAI_API_KEY="Z.ai"
```

**¿Cómo obtener tus tokens de Turso?**
1. Ve a https://turso.tech/app
2. Login con tu cuenta
3. Selecciona tu base de datos `coachfit-ai`
4. Click en "Settings" → "Tokens" → crea uno nuevo
5. Copia la URL y el token

### PASO 3: Instalar Capacitor y plugins nativos

```bash
# Capacitor core
bun add @capacitor/core @capacitor/cli

# Android platform
bun add @capacitor/android

# Plugins nativos para que funcione todo:
bun add @capacitor/local-notifications    # Notificaciones reales
bun add @capacitor-community/geolocation  # GPS mejorado
bun add @capacitor-community/health       # Samsung Health / Google Fit
bun add @capacitor/filesystem             # Para guardar audio
bun add @capacitor-community/sqlite       # SQLite nativo (offline)
```

### PASO 4: Inicializar Capacitor

```bash
# Inicializar (solo la primera vez)
bunx cap init "CoachFit AI" "com.tuempresa.coachfit" --web-dir=out
```

Esto crea el archivo `capacitor.config.ts`. Edítalo para que quede así:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.coachfit',
  appName: 'CoachFit AI',
  webDir: 'out',
  server: {
    // Si quieres que use la versión web de Vercel (más simple):
    // url: 'https://coachfit-ai-phi.vercel.app',
    // Si prefieres offline completo (recomendado para APK), deja comentado
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#059669',
    },
  },
};

export default config;
```

### PASO 5: Configurar Next.js para export estático

Edita el archivo `next.config.ts` y cambia la configuración:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CAMBIAR: 'standalone' (Vercel) → 'export' (APK)
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Necesario para export estático
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**⚠️ IMPORTANTE**: El export estático tiene limitaciones:
- Las API routes (serverless functions) NO funcionan en APK puro
- Necesitas usar SQLite local + sincronizar con Turso
- La IA requiere un endpoint externo (Vercel o tu propio backend)

**Solución recomendada**: Deja la app web en Vercel y el APK la carga dentro:

```typescript
// capacitor.config.ts - versión simple (recomendada)
const config: CapacitorConfig = {
  appId: 'com.tuempresa.coachfit',
  appName: 'CoachFit AI',
  webDir: 'out',
  server: {
    // El APK carga la web de Vercel + plugins nativos
    url: 'https://coachfit-ai-phi.vercel.app',
    cleartext: true,
  },
};
```

Esta opción es más simple y todas las funciones (IA, DB, notificaciones) funcionan. Los plugins nativos (cámara, GPS, notificaciones) funcionan encima.

### PASO 6: Construir la web

```bash
# Generar el build estático
bun run build
```

Esto crea la carpeta `out/` con todos los archivos estáticos.

### PASO 7: Agregar plataforma Android

```bash
# Agregar Android (solo la primera vez)
bunx cap add android

# Sincronizar archivos web con Android
bunx cap sync
```

Esto crea la carpeta `android/` con el proyecto nativo.

### PASO 8: Configurar permisos en AndroidManifest.xml

Edita el archivo `android/app/src/main/AndroidManifest.xml` y agrega estos permisos ANTES de `<application>`:

```xml
<!-- Permisos básicos -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- GPS para rutas de carrera -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Micrófono para voz a texto -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Notificaciones (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Samsung Health / Health Connect -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.BODY_SENSORS" />
<uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />

<!-- Para que la app pueda ver Samsung Health y Health Connect -->
<queries>
    <package android:name="com.samsung.android.app.health" />
    <package android:name="com.google.android.apps.healthdata" />
    <intent>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent>
</queries>
```

### PASO 9: Abrir en Android Studio

```bash
# Abrir el proyecto en Android Studio
bunx cap open android
```

Android Studio se abrirá con el proyecto cargado. Espera a que termine de sincronizar (puede tardar 2-5 minutos la primera vez).

### PASO 10: Generar el APK

En Android Studio:

1. **Build APK de debug** (para probar tú mismo):
   - Menú: `Build` → `Build Bundle(s)/APK(s)` → `Build APK(s)`
   - Espera 3-10 minutos (la primera vez tarda más)
   - Cuando termine, verás una notificación: "APK(s) generated successfully"
   - Click en "locate" para abrir la carpeta
   - El APK está en: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Generar APK firmado** (para distribuir o Play Store):
   - Menú: `Build` → `Generate Signed Bundle / APK`
   - Selecciona "APK" → Next
   - Si tienes keystore: selecciónalo
   - Si no: click "Create new..." y crea uno (guarda la contraseña bien)
   - Selecciona "release" → Finish
   - El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

### PASO 11: Instalar el APK en tu celular

**Opción A: Por cable USB**
1. Conecta tu celular a la compu
2. Copia el archivo `app-debug.apk` a tu celular
3. En el celular, abre el archivo con "Files" o "Documentos"
4. Si pide permiso para instalar apps desconocidas → permite
5. Click en "Instalar"

**Opción B: Directo desde Android Studio**
1. Conecta tu celular por USB con Depuración USB activada
2. En Android Studio, selecciona tu dispositivo en el dropdown
3. Click en el botón ▶️ (Run)
4. La app se instala y abre automáticamente

**Para activar Depuración USB:**
- Ajustes → Acerca del teléfono → Toca 7 veces "Número de compilación"
- Ajustes → Opciones de desarrollador → Activa "Depuración USB"

---

## 🎯 Funciones que funcionarán en el APK

### ✅ Funcionan automáticamente
- **Toda la UI** (modo oscuro, navegación, dashboard)
- **Planes de comidas y ejercicio** generados por IA
- **Notificaciones locales** (con @capacitor/local-notifications)
- **GPS para rutas** (mejorado con @capacitor-community/geolocation)
- **Voz a texto** (Web Speech API funciona en Android WebView)
- **Base de datos local** (SQLite nativo si configuras @capacitor-community/sqlite)
- **Sincronización con Turso** (cuando hay internet)

### ⚙️ Requieren configuración adicional
- **Samsung Health**: Necesitas implementar el bridge con Health Connect
- **Google Fit**: Necesitas OAuth de Google Fit API
- **Notificaciones push en background**: Necesitas Firebase Cloud Messaging

---

## 🔧 Configuración avanzada (opcional)

### Para que Samsung Health funcione nativo

Crea el archivo `src/lib/health-native.ts`:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications'

// Verificar si Health Connect está disponible
async function checkHealthConnect() {
  // En Android 14+, Health Connect viene integrado
  // En versiones anteriores, hay que instalar la app
  try {
    const response = await fetch('content://com.google.android.apps.healthdata')
    return true
  } catch {
    return false
  }
}

// Leer ritmo cardíaco (requiere Android 14+ con Health Connect)
async function readHeartRate() {
  // Implementar con @capacitor-community/health
  // o usar el SDK nativo de Health Connect
}

// Leer pasos del día
async function readStepsToday() {
  // Implementar con Health Connect
}
```

### Para notificaciones en background

Las notificaciones push reales (cuando la app está cerrada) requieren Firebase:

```bash
# Instalar Firebase
bun add @capacitor/push-notifications
bun add firebase-admin
```

Configura Firebase Console y agrega `google-services.json` a `android/app/`.

---

## 🐛 Solución de problemas

### Error: "SDK location not found"
Crea el archivo `android/local.properties`:
```
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```
(En Mac: `sdk.dir=/Users/TU_USUARIO/Library/Android/sdk`)

### Error: "Build failed: Gradle"
```bash
# Limpiar cache de Gradle
cd android
./gradlew clean
cd ..
bunx cap sync
```

### Error: "WebView shows blank page"
- Verifica que `webDir: 'out'` en capacitor.config.ts
- Verifica que `bun run build` generó la carpeta `out/`
- Ejecuta `bunx cap sync` otra vez

### La app no tiene conexión a internet
Agrega esto a AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<application android:usesCleartextTraffic="true" ...>
```

### Notificaciones no aparecen
En Android 13+ necesitas pedir permiso explícitamente:
```typescript
import { LocalNotifications } from '@capacitor/local-notifications'

// Pedir permiso
const perm = await LocalNotifications.requestPermissions()
if (perm.display !== 'granted') {
  console.log('Permiso denegado')
}
```

---

## 📦 Tamaño del APK

- APK debug: ~25-35 MB
- APK release: ~15-20 MB
- Con recursos nativos: ~30-40 MB

---

## 🚀 Resumen rápido (comandos en orden)

```bash
# 1. Clonar
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai
bun install

# 2. Crear .env con tus tokens de Turso
# (edita el archivo manualmente)

# 3. Instalar Capacitor
bun add @capacitor/core @capacitor/cli @capacitor/android
bun add @capacitor/local-notifications @capacitor-community/geolocation

# 4. Configurar
bunx cap init "CoachFit AI" "com.tuempresa.coachfit" --web-dir=out

# 5. Cambiar next.config.ts: output: "standalone" → "export"

# 6. Build
bun run build

# 7. Android
bunx cap add android
bunx cap sync

# 8. Abrir Android Studio
bunx cap open android

# 9. En Android Studio: Build → Build APK
```

---

## ❓ Preguntas frecuentes

**¿Necesito una Mac?**
No, puedes generar el APK en Windows, Mac o Linux.

**¿Cuánto cuesta publicar en Play Store?**
$25 USD (pago único) para cuenta de desarrollador de Google.

**¿Puedo distribuir el APK sin Play Store?**
Sí, puedes compartir el archivo .apk por WhatsApp, email, etc. El usuario solo necesita activar "Instalar apps desconocidas".

**¿La app funciona sin internet?**
Parcialmente. Con `@capacitor-community/sqlite` puedes tener datos locales. La IA y la sincronización con Turso necesitan internet.

**¿Puedo actualizar la app sin recompilar?**
Si usas la opción `server.url` en capacitor.config.ts (carga la web de Vercel), los cambios que hagas en Vercel se reflejan automáticamente en el APK sin necesidad de recompilar.

---

## 📞 ¿Necesitas ayuda?

- Revisa los errores en Android Studio (pestaña "Build" → "Console")
- Busca el error específico en Google
- Abre un Issue en: https://github.com/WalterShadow2001/coachfit-ai/issues

¡Suerte con tu APK! 🎉
