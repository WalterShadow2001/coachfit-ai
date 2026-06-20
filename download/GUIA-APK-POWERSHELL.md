# 📱 Guía Completa: Cómo convertir CoachFit AI en APK (Windows PowerShell)

Tu app ya está en GitHub (https://github.com/WalterShadow2001/coachfit-ai) y funcionando en Vercel (https://coachfit-ai-phi.vercel.app). Esta guía te lleva paso a paso para tener un APK instalable en tu Android.

**Todo en PowerShell** ✅

---

## 📋 Requisitos previos (instalar en tu computadora)

### 1. Node.js 20+ LTS
- Descarga de: https://nodejs.org/
- Elige "LTS" (no "Current")
- Instala con opciones por defecto
- Verifica abriendo PowerShell:
```powershell
node --version
# Debe decir v20.x o superior
```

### 2. Bun (gestor de paquetes)
Abre PowerShell y ejecuta:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```
**Después CIERRA y vuelve a abrir PowerShell**, luego verifica:
```powershell
bun --version
```

### 3. Android Studio
- Descarga de: https://developer.android.com/studio
- Instala con todas las opciones por defecto
- **Importante**: Cuando lo abras por primera vez, deja que instale el Android SDK
- Necesitas ~5 GB de espacio libre
- Verifica que se instala en una de estas rutas:
  - `C:\Program Files\Android\Android Studio\`
  - `C:\Users\TU_USUARIO\AppData\Local\Programs\Android Studio\`

### 4. Git
- Si no lo tienes: https://git-scm.com/
- Verifica:
```powershell
git --version
```

---

## 🚀 Método rápido (recomendado)

### Paso 1: Abrir PowerShell

- Presiona `Windows + X`
- Selecciona "Windows PowerShell" o "Terminal"
- **NO necesitas abrirlo como Administrador** (a menos que diga lo contrario)

### Paso 2: Clonar el repositorio

```powershell
# Navega a donde quieres el proyecto (ej: Documentos)
cd $env:USERPROFILE\Documents

# Clonar
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai
```

### Paso 3: Ejecutar el script automático

```powershell
.\scripts\prepare-apk.ps1
```

Si te aparece un error de "scripts deshabilitados", ejecuta primero:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Y responde `S` o `Y`.

El script te va a pedir:
1. **Tu TURSO_DATABASE_URL** (obtenlo de https://turso.tech/app)
2. **Tu TURSO_AUTH_TOKEN** (obtenlo de la misma página)
3. **¿Qué modo prefieres?** → Responde `1` (WebView, recomendado)

El script automáticamente:
- ✅ Crea el archivo `.env`
- ✅ Instala todas las dependencias
- ✅ Instala Capacitor y plugins nativos
- ✅ Inicializa Capacitor
- ✅ Configura `capacitor.config.ts`
- ✅ Agrega plataforma Android
- ✅ Sincroniza todo
- ✅ Configura permisos en AndroidManifest.xml (GPS, micrófono, notificaciones, sensores)

### Paso 4: Abrir en Android Studio

```powershell
.\scripts\open-android-studio.ps1
```

O manualmente:
```powershell
bunx cap open android
```

Android Studio se abrirá. **Espera 2-5 minutos** la primera vez mientras sincroniza el proyecto.

### Paso 5: Generar el APK

En Android Studio:

1. **APK de debug** (para probar tú mismo):
   - Menú superior: `Build` → `Build Bundle(s)/APK(s)` → `Build APK(s)`
   - Espera 3-10 minutos (la primera vez tarda más)
   - Cuando termine, verás una notificación: "APK(s) generated successfully"
   - Click en "locate" para abrir la carpeta

2. **APK firmado** (para Play Store o distribuir):
   - Menú: `Build` → `Generate Signed Bundle / APK`
   - Selecciona "APK" → Next
   - Si tienes keystore: selecciónalo
   - Si no: click "Create new..." y crea uno (guarda la contraseña bien)
   - Selecciona "release" → Finish

### Paso 6: Localizar el APK

Vuelve a PowerShell y ejecuta:
```powershell
.\scripts\find-apk.ps1
```

Te dirá la ruta exacta y abrirá la carpeta en Explorer.

El archivo se llama:
- `app-debug.apk` (debug)
- `app-release.apk` (firmado)
- Está en: `android\app\build\outputs\apk\debug\` o `...\release\`

### Paso 7: Instalar en tu celular

**Opción A: Por cable USB**
1. Conecta tu celular a la compu por USB
2. En el celular, selecciona "Transferencia de archivos"
3. Copia el archivo `app-debug.apk` al celular (a Descargas o cualquier carpeta)
4. En el celular, abre "Files" o "Documentos"
5. Busca el APK y ábrelo
6. Si pide permiso para instalar apps desconocidas → permite
7. Click en "Instalar"

**Opción B: Directo desde Android Studio**
1. Conecta tu celular por USB con Depuración USB activada
2. En Android Studio, selecciona tu dispositivo en el dropdown (arriba)
3. Click en el botón ▶️ (Run) verde
4. La app se instala y abre automáticamente

**Para activar Depuración USB en tu celular:**
- Ajustes → Acerca del teléfono → Toca 7 veces "Número de compilación"
- Ajustes → Sistema → Opciones de desarrollador → Activa "Depuración USB"

---

## 🔄 Mantener actualizado

### Si cambias algo en GitHub o Vercel y quieres verlo en el APK

**Si usaste modo WebView (opción 1):**
```powershell
# No necesitas hacer nada! El APK carga Vercel automáticamente
# Solo abre la app y verás los cambios
```

**Si usaste modo Offline (opción 2):**
```powershell
# 1. Bajar los cambios más recientes
git pull

# 2. Sincronizar con Android
.\scripts\sync-android.ps1

# 3. Volver a generar APK en Android Studio
```

### Si cambias algo del código tú mismo

```powershell
# Sincronizar cambios
.\scripts\sync-android.ps1

# Volver a abrir Android Studio
.\scripts\open-android-studio.ps1
```

---

## 🎯 Funciones que van a funcionar en el APK

### ✅ Automático (sin configuración extra)
- Toda la UI (modo oscuro, navegación, dashboard)
- Planes de comidas y ejercicio generados por IA
- Notificaciones locales (con @capacitor/local-notifications)
- GPS para rutas de carrera (con @capacitor-community/geolocation)
- Voz a texto (Web Speech API funciona en Android WebView)
- Base de datos Turso (cuando hay internet)
- Modo oscuro
- Perfil, horarios múltiples, meta de peso con advertencias

### ⚙️ Modo WebView (opción 1, recomendado)
TODO funciona porque carga la web de Vercel. Solo los plugins nativos dan superpoderes extra:
- Notificaciones reales (no las del navegador)
- GPS mejorado
- Vibración
- Cámara (si la necesitas)

### ⚙️ Modo Offline (opción 2)
- Funciona sin internet (datos en SQLite local)
- Las API routes (IA, sync con Turso) NO funcionan
- Necesitas implementar lógica offline manualmente

---

## 🐛 Solución de problemas (PowerShell)

### Error: "cannot be loaded because running scripts is disabled"
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Responde `S` o `Y`.

### Error: "bun: command not found"
CIERRA PowerShell y vuelve a abrirlo. Si no funciona:
```powershell
# Verificar si Bun está instalado
Get-Command bun -ErrorAction SilentlyContinue

# Si no aparece, reinstalar:
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Error: "SDK location not found" en Android Studio
Crea el archivo `android\local.properties`:
```powershell
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
"sdk.dir=$sdkPath" | Out-File -FilePath "android\local.properties" -Encoding ASCII
```

### Error: "Build failed: Gradle" en Android Studio
En PowerShell:
```powershell
cd android
.\gradlew clean
cd ..
bunx cap sync
```

### Error: "WebView shows blank page"
```powershell
# Verificar que out/ existe
Test-Path "out"

# Si no existe, hacer build
bun run build

# Sincronizar
bunx cap sync
```

### La app no tiene conexión a internet
Verifica que AndroidManifest.xml tenga:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<application android:usesCleartextTraffic="true" ...>
```

Si no lo tiene, ejecuta otra vez:
```powershell
.\scripts\prepare-apk.ps1
```

### Notificaciones no aparecen
En Android 13+ necesitas pedir permiso. La app lo pide automáticamente la primera vez. Si no:
- Ajustes del celular → Apps → CoachFit AI → Notificaciones → Permitir

### Android Studio muy lento
- Cierra otros programas
- Aumenta la RAM en Android Studio: `Help` → `Edit Custom VM Options` → cambia `-Xmx` a `-Xmx4096m`

### No encuentro el APK después del build
```powershell
.\scripts\find-apk.ps1
```

---

## 📦 Resumen rápido (comandos en orden)

```powershell
# 1. Clonar
cd $env:USERPROFILE\Documents
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai

# 2. Preparar todo (ejecuta el script)
.\scripts\prepare-apk.ps1

# 3. Abrir Android Studio
.\scripts\open-android-studio.ps1

# 4. En Android Studio: Build → Build APK(s)

# 5. Encontrar el APK
.\scripts\find-apk.ps1

# 6. Copiar a celular e instalar
```

---

## ❓ Preguntas frecuentes

**¿Necesito una Mac?**
No, todo funciona en Windows.

**¿Cuánto cuesta publicar en Play Store?**
$25 USD (pago único) para cuenta de desarrollador de Google.

**¿Puedo distribuir el APK sin Play Store?**
Sí, puedes compartir el archivo .apk por WhatsApp, email, etc. El usuario solo necesita activar "Instalar apps desconocidas".

**¿La app funciona sin internet?**
- Modo WebView (recomendado): NO, necesita internet para cargar Vercel
- Modo Offline: Sí, pero las funciones de IA no funcionan

**¿Puedo actualizar la app sin recompilar?**
Si usaste modo WebView (opción 1), los cambios que hagas en Vercel se reflejan automáticamente en el APK sin necesidad de recompilar.

**¿Cuánto tarda generar el APK?**
- La primera vez: 5-15 minutos (instalación de SDK, build inicial)
- Siguientes veces: 1-3 minutos

**¿Qué tamaño tiene el APK?**
- APK debug: ~25-35 MB
- APK release: ~15-20 MB

---

## 📞 ¿Necesitas ayuda?

1. Revisa los errores en Android Studio (pestaña "Build" → "Console")
2. Ejecuta los scripts auxiliares:
   - `.\scripts\find-apk.ps1` - encuentra el APK
   - `.\scripts\sync-android.ps1` - sincroniza cambios
   - `.\scripts\open-android-studio.ps1` - abre Android Studio
3. Abre un Issue en: https://github.com/WalterShadow2001/coachfit-ai/issues

¡Suerte con tu APK! 🎉
