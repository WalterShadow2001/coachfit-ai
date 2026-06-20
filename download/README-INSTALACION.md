# CoachFit AI - Guía de Instalación y Conversión a APK

## 📱 ¿Qué es CoachFit AI?

Es una aplicación de coaching personal con IA que:
- **Genera planes de comida semanales** basados en tu presupuesto, horario y restricciones
- **Genera rutinas de ejercicio** adaptadas a tu equipo disponible y tiempo
- **Te envía notificaciones inteligentes** que respetan tu horario de trabajo
- **Registra lo que comes y haces** para darte feedback diario
- **Te "molesta" con recordatorios** hasta que respondas (Sí / Más tarde / Omitir)
- **Compara tu plan vs realidad** y te dice qué mejorar

## 🚀 Usar como PWA (lo más rápido)

### En tu celular Android:
1. Abre Chrome en tu celular
2. Visita la URL de tu app desplegada en Vercel
3. Menú (⋮) → **Agregar a pantalla de inicio**
4. ¡Listo! Se abre como app nativa, funciona offline, recibe notificaciones

### Ventajas PWA:
- ✅ Funciona inmediatamente
- ✅ Se instala como app
- ✅ Funciona offline
- ✅ Recibe notificaciones push
- ✅ Accede a cámara, GPS, etc.

## 🔧 Convertir a APK real (con Capacitor)

### Requisitos:
- Tener instalado: **Node.js 20+**, **Android Studio**, **JDK 17**
- Tu computadora (no se puede hacer desde el celular)

### Pasos:

```bash
# 1. Clonar el proyecto
git clone <tu-repo-github>
cd coachfit-ai

# 2. Instalar dependencias
bun install  # o npm install

# 3. Instalar Capacitor
bun add @capacitor/core @capacitor/cli
bun add @capacitor/android

# 4. Inicializar Capacitor
bunx cap init CoachFitAI com.tuempresa.coachfit --web-dir=out

# 5. Construir la app web (Next.js static export)
# En next.config.ts cambiar output: "export"
bun run build

# 6. Agregar plataforma Android
bunx cap add android

# 7. Sincronizar assets
bunx cap sync

# 8. Abrir en Android Studio
bunx cap open android

# 9. En Android Studio:
#    - Build → Build Bundle(s)/APK(s) → Build APK(s)
#    - El APK se genera en: android/app/build/outputs/apk/debug/app-debug.apk
```

### Para notificaciones push reales en APK:
```bash
bun add @capacitor/local-notifications @capacitor/push-notifications
```

Luego en tu código, en lugar del Service Worker, usa la API nativa de Capacitor.

## ☁️ Desplegar en Vercel + Turso (cloud sync)

### 1. Crear base de datos en Turso
```bash
# Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login (usa tu token nuevo, NO el que compartiste en el chat)
turso auth login

# Crear base de datos
turso db create coachfit

# Obtener URL de conexión
turso db show coachfit --url

# Crear token de acceso
turso db tokens create coachfit
```

### 2. Actualizar schema de Prisma para Turso
```prisma
// prisma/schema.prisma
datasource db {
  provider = "libsql"
  url      = env("TURSO_DATABASE_URL")
  directUrl = env("TURSO_AUTH_TOKEN")
}
```

Instalar el adapter:
```bash
bun add @prisma/adapter-libsql
```

### 3. Configurar variables de entorno en Vercel
```
TURSO_DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io
TURSO_AUTH_TOKEN=<token-nuevo>
DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io?authToken=<token-nuevo>
```

### 4. Actualizar lib/db.ts
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})
const adapter = new PrismaLibSQL(libsql)
const prisma = new PrismaClient({ adapter })

export const db = prisma
```

### 5. Desplegar
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login (con token NUEVO, no el que compartiste)
vercel login

# Desplegar
vercel --prod
```

### 6. Push a GitHub
```bash
git init
git add .
git commit -m "Initial commit: CoachFit AI"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/coachfit-ai.git
git push -u origin main
```

## 🔒 Seguridad IMPORTANTE

**Los tokens que compartiste en el chat ya están comprometidos.** Debes:

1. **GitHub**: https://github.com/settings/tokens → Revoke + Create new
2. **Vercel**: https://vercel.com/account/tokens → Delete + Create new
3. **Turso**: https://turso.tech/app/account/api-tokens → Revoke + Create new

Guarda los nuevos en:
- Variables de entorno en Vercel (para producción)
- `.env.local` (para desarrollo, NO lo subas a git)
- Gestor de contraseñas (Bitwarden, 1Password)

## 📲 Notificaciones constantes en Android

El sistema de notificaciones de CoachFit:
- ✅ Respeta tu horario de trabajo (solo notifica en lunch durante horas laborales)
- ✅ Respeta horas silenciosas (10pm - 7am por defecto)
- ✅ Si no respondes → te vuelve a recordar cada X minutos (configurable)
- ✅ Máximo de reintentos (para no ser molesto en exceso)
- ✅ Si respondes "Más tarde" → te recuerda en 15 min
- ✅ Si respondes "Omitir" → se calla hasta el siguiente evento

### Para notificaciones en APK (no PWA):
Las PWAs tienen limitaciones con notificaciones en segundo plano. Para APK real con Capacitor:

```bash
bun add @capacitor/local-notifications
```

```typescript
import { LocalNotifications } from '@capacitor/local-notifications'

// Programar notificación
await LocalNotifications.schedule({
  notifications: [{
    title: 'Hora de comer',
    body: 'Tu lunch planeado: Pollo con arroz',
    id: 1,
    schedule: { at: new Date('2026-06-20T14:00:00') },
    actionTypeId: 'RESPOND',
    extra: { type: 'meal' }
  }]
})
```

## 🎯 Próximos pasos sugeridos

1. **Pruébalo como PWA primero** - Instálalo en tu celular desde Chrome
2. **Genera tu primer plan** - Completa el onboarding y haz clic en "Generar plan con IA"
3. **Configura tus horarios** - En Ajustes, define cuándo te puedo molestar
4. **Registra todo durante 1 semana** - Mientras más registres, mejor feedback te doy
5. **Cuando gustes, conviértelo a APK** - Sigue los pasos de arriba

## 🐛 Solución de problemas

### La IA tarda mucho en responder
- Es normal: la generación de plan semanal toma 10-30 segundos
- Si falla, hay un plan de respaldo automático

### No me llegan notificaciones
- Verifica que tengas notificaciones activadas en Ajustes
- En Chrome: click en el ícono de candado → Permitir notificaciones
- En Android: Ajustes → Apps → Chrome → Notificaciones

### La app no carga offline
- Asegúrate de visitarla al menos una vez online
- El Service Worker cachea los recursos automáticamente

### Perdí mis datos
- Si usas solo PWA: los datos están en el dispositivo + en la DB local del servidor
- Si configuraste Turso: los datos están en la nube, accesibles desde cualquier dispositivo
