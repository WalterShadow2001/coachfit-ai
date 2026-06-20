# CoachFit AI - Guía de Instalación y APK

## 📱 ¿Qué hace CoachFit AI?

App de coaching personal con IA que:
- **Genera planes de comida semanales** basados en tu presupuesto, horario y restricciones
- **Genera rutinas de ejercicio** adaptadas a tu equipo y tiempo
- **Te envía notificaciones inteligentes** que respetan tu horario de trabajo
- **Sin opción de omitir**: se hace o se hace (solo "Ya lo hice" o "Más tarde")
- **Responde con voz**: habla y la IA transcribe e interpreta
- **Registra lo que comes y haces** para darte feedback diario
- **Modo oscuro** con toggle en el header
- **Funciona offline** (SQLite local) + **sincroniza con Turso** (nube)

## 🚀 Opción 1: PWA (lo más rápido)

### En tu celular Android:
1. Abre Chrome en tu celular
2. Visita la URL donde está corriendo la app
3. Menú (⋮) → **Agregar a pantalla de inicio**
4. ¡Listo! Se abre como app nativa, funciona offline

### Ventajas PWA:
- ✅ Funciona inmediatamente
- ✅ Se instala como app
- ✅ Funciona offline
- ✅ Recibe notificaciones push
- ✅ Modo oscuro
- ✅ Voz a texto con IA

## 🔧 Opción 2: APK real con Capacitor (recomendado para uso a largo plazo)

### Requisitos en tu computadora:
- **Node.js 20+** o Bun
- **Android Studio** instalado
- **JDK 17**

### Pasos:

```bash
# 1. Clonar el proyecto
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai

# 2. Instalar dependencias
bun install

# 3. Instalar Capacitor
bun add @capacitor/core @capacitor/cli @capacitor/android
bun add @capacitor/local-notifications  # notificaciones nativas
bun add @capacitor-community/sqlite     # SQLite nativo

# 4. Cambiar next.config.ts a static export
# Edita next.config.ts y cambia output: "standalone" por output: "export"

# 5. Construir la app web
bun run build

# 6. Inicializar Capacitor
bunx cap init CoachFitAI com.tuempresa.coachfit --web-dir=out

# 7. Agregar plataforma Android
bunx cap add android

# 8. Sincronizar assets
bunx cap sync

# 9. Abrir en Android Studio
bunx cap open android

# 10. En Android Studio:
#     Build → Build Bundle(s)/APK(s) → Build APK(s)
#     El APK se genera en:
#     android/app/build/outputs/apk/debug/app-debug.apk
```

### Para notificaciones nativas en APK:
```typescript
// src/lib/notifications-native.ts
import { LocalNotifications } from '@capacitor/local-notifications'

export async function scheduleNotification(
  title: string,
  body: string,
  at: Date,
  payload: any
) {
  await LocalNotifications.schedule({
    notifications: [{
      title,
      body,
      id: Date.now(),
      schedule: { at },
      actionTypeId: 'RESPOND',
      extra: payload,
    }]
  })
}
```

### Para SQLite nativo en APK (mejor que Web SQL):
```typescript
// src/lib/db-native.ts
import { CapacitorSQLite } from '@capacitor-community/sqlite'

const dbConnection = await CapacitorSQLite.createConnection({
  database: 'coachfit',
  version: 1,
})

await dbConnection.open()

// Crear tablas (mismo schema que Prisma)
await dbConnection.execute(`
  CREATE TABLE IF NOT EXISTS MealLog (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    actualName TEXT NOT NULL,
    calories INTEGER,
    loggedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    syncStatus TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'manual'
  )
`)
```

## ☁️ Configurar Turso (sync en la nube)

### Por qué Turso
Turso es SQLite distribuido. Te permite:
- Tener respaldo en la nube de tus datos
- Acceder desde múltiples dispositivos
- Funciona offline-first (escribe local, sync cuando hay internet)

### Pasos

```bash
# 1. Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login
turso auth login

# 3. Crear base de datos
turso db create coachfit

# 4. Obtener URL de conexión
turso db show coachfit --url
# → libsql://coachfit-<tu-usuario>.turso.io

# 5. Crear token de acceso
turso db tokens create coachfit
# → eyJhbGciOiJFZERTQSIs...
```

### Actualizar Prisma para Turso

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "libsql"
  url       = env("TURSO_DATABASE_URL")
  directUrl = env("TURSO_AUTH_TOKEN")
}
```

```bash
bun add @prisma/adapter-libsql @libsql/client
bun run db:push
```

### Actualizar src/lib/db.ts

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

### Variables de entorno

```bash
# .env (NO subir a git)
TURSO_DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIs...
DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io?authToken=<token>
```

### Activar sync desde la app
1. Abre la app → **Ajustes**
2. Sección "Sincronización con la nube"
3. Toggle "Activar sync con Turso"
4. Click "Sincronizar ahora"

## 🎤 Configurar voz a texto

No necesitas configuración adicional. La app usa:
- **MediaRecorder API** del navegador para grabar audio
- **z-ai-web-dev-sdk** (ASR) para transcribir
- **IA** para interpretar el texto transcrito

### Permisos necesarios
- **Micrófono**: se pide automáticamente al primer uso
- En Android APK: agregar al manifest:
  ```xml
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  ```

### Cómo funciona
1. Tocas "Responder con voz" en una notificación
2. Se abre el modal de Quick Log en modo voz
3. Tocas "Toca para hablar" y hablas
4. Mientras hablas, ves el nivel de audio
5. Tocas "Detener y transcribir"
6. La IA transcribe el audio
7. La IA interpreta el texto y llena los campos:
   - "comí pollo con arroz, 500 calorías, sí seguí el plan"
   - → name: "Pollo con arroz", calories: 500, onPlan: true
8. Verificas y registras

## 🌙 Modo oscuro

- Toggle en el header (icono luna/sol)
- Auto-detección de preferencia del sistema operativo
- Persistencia en localStorage
- Tema emerald primary en ambos modos

## 🔒 Seguridad IMPORTANTE

**NUNCA subas tokens a git.** Los archivos `.env*` ya están en `.gitignore`.

Para APK, guarda los tokens en:
- `android/app/src/main/assets/env.json` (no subir a git)
- O compílalos como variables de build en `build.gradle`

Para Turso en producción:
- Usa Turso Auth Tokens con permisos limitados
- Rota los tokens cada 90 días
- Diferentes tokens para dev/staging/prod

## 📲 Notificaciones constantes en Android

El sistema de notificaciones de CoachFit:
- ✅ Respeta tu horario de trabajo
- ✅ Respeta horas silenciosas (10pm - 7am)
- ✅ Si no respondes → te vuelve a recordar cada X min
- ✅ Máximo de reintentos configurable
- ✅ Si respondes "Más tarde" → te recuerda en 15 min
- ❌ **NO hay opción de omitir** — se hace o se hace

### Para notificaciones en APK (background real)
Las PWAs tienen limitaciones con notificaciones en segundo plano. Para APK real:

```bash
bun add @capacitor/local-notifications
```

```typescript
import { LocalNotifications } from '@capacitor/local-notifications'

// Pedir permiso
const perm = await LocalNotifications.requestPermissions()

// Programar notificación recurrente
await LocalNotifications.schedule({
  notifications: [{
    title: 'Hora de comer',
    body: 'Tu lunch: Pollo con arroz',
    id: 1,
    schedule: {
      at: new Date('2026-06-20T14:00:00'),
      every: 'day',
    },
    actionTypeId: 'MEAL_RESPONSE',
    extra: { type: 'meal' }
  }]
})

// Registrar acciones
await LocalNotifications.addActionTypes({
  types: [{
    id: 'MEAL_RESPONSE',
    actions: [
      { id: 'DONE', title: 'Ya lo hice' },
      { id: 'LATER', title: 'Más tarde' },
    ]
  }]
})
```

## 🎯 Próximos pasos sugeridos

1. **Pruébalo como PWA primero** - Instálalo en tu celular desde Chrome
2. **Genera tu primer plan** - Completa el onboarding
3. **Prueba responder con voz** - Habla cuando te llegue una notificación
4. **Configura Turso** - Para tener respaldo en la nube
5. **Cuando gustes, conviértelo a APK** - Sigue los pasos de arriba

## 🐛 Solución de problemas

### La IA tarda mucho en responder
- Generación de plan semanal: 10-30 segundos
- Transcripción de voz: 2-5 segundos
- Si falla, hay plan de respaldo automático

### No me llegan notificaciones
- Verifica que tengas notificaciones activadas en Ajustes
- En Chrome: click en el candado → Permitir notificaciones
- En Android APK: permissions en manifest

### La voz no funciona
- Verifica permisos de micrófono
- En Chrome: candado → Micrófono → Permitir
- Habla claro y cerca del micrófono
- La transcripción funciona mejor con audio de 1-10 segundos

### Perdí mis datos
- Si usas solo local: están en el dispositivo
- Si activaste Turso: están en la nube, accesibles desde cualquier dispositivo
- Ejecuta "Sincronizar ahora" en Ajustes

### El modo oscuro no se ve bien
- Toca el icono de luna/sol en el header
- Limpia cache del navegador
- Verifica que tu navegador soporta CSS variables (cualquiera moderno)

## 📞 Soporte

Si tienes preguntas:
- Abre un [Issue](https://github.com/WalterShadow2001/coachfit-ai/issues)
- Revisa este README
