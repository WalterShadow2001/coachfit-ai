# 🏋️ CoachFit AI

> Tu entrenador personal con IA que te ayuda a bajar de peso con planes de comida, ejercicio y notificaciones inteligentes. Responde con voz, funciona offline, y sincroniza con la nube.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Turso](https://img.shields.io/badge/Turso-Cloud_Cyan?logo=turso)](https://turso.tech/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📋 Tabla de contenidos

- [¿Qué es?](#-qué-es)
- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Instalación local](#-instalación-local)
- [Configurar Turso (nube)](#-configurar-turso-nube)
- [Convertir a APK](#-convertir-a-apk)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Cómo funciona](#-cómo-funciona)

## 🤖 ¿Qué es?

CoachFit AI es una app de coaching personal inteligente que:

1. **Te hace preguntas** sobre tu peso, objetivo, presupuesto, horario de trabajo y restricciones
2. **Genera un plan semanal** completo con IA: comidas + ejercicio adaptados a ti
3. **Te "molesta" con notificaciones** inteligentes que respetan tu horario laboral
4. **Sin opción de omitir**: solo "Ya lo hice" o "Más tarde" — se hace o se hace
5. **Responde con voz**: habla y la IA transcribe e interpreta tu respuesta
6. **Conecta con Samsung Health**: pasos, calorías, ritmo cardíaco, ejercicios automáticos
7. **Horarios múltiples por día**: L-V diferente a sábado, diferente a domingo (iglesia)
8. **Funciona offline** con base de datos local
9. **Sincroniza con la nube** con Turso cuando hay internet
10. **Te enseña qué mejorar** con análisis de adherencia y mensajes motivadores

## ✨ Características

### 🧠 IA integrada (z-ai-web-dev-sdk)
- **Plan de comidas semanal**: 7 días × desayuno/lunch/cena/snacks + lista de compras
- **Rutina de ejercicio semanal**: 7 días adaptados a tu equipo y tiempo
- **Feedback diario**: compara plan vs realidad, score 0-100, mejoras, motivación
- **Voz a texto (ASR)**: transcribe tu audio cuando respondes a una notificación
- **Parseo inteligente**: la IA interpreta "comí pollo con arroz, 500 calorías, sí seguí el plan" → campos estructurados

### 🔔 Notificaciones inteligentes (se hace o se hace)
- ❌ **NO hay botón "Omitir"** — solo "Ya lo hice" o "Más tarde"
- Respeta tu horario de trabajo (solo notifica en lunch y horas libres)
- Respeta horas silenciosas (10pm - 7am por defecto)
- Si no respondes → te vuelve a recordar cada X minutos (configurable)
- Tres formas de responder:
  - **Texto**: abre modal de Quick Log
  - **Voz**: graba audio, IA transcribe y llena los campos automáticamente
  - **Más tarde**: te vuelve a molestar en 15 min

### 🎤 Voz a texto con IA
- Botón "Responder con voz" en cada notificación
- Botón "Hablar para registrar" en Logger
- La IA transcribe y extrae automáticamente:
  - Qué comiste / qué ejercicio hiciste
  - Calorías (si las mencionas)
  - Duración e intensidad (para ejercicio)
  - Si cumpliste el plan o no
  - Notas adicionales
- Ejemplos que la IA entiende:
  - "comí pollo con arroz y ensalada, como 500 calorías, sí seguí el plan"
  - "hice 30 minutos de caminata, intensidad media, quemé 200 calorías"
  - "me comí unas tortas, no era el plan pero estaban ricas"

### 🌙 Modo oscuro
- Toggle en el header (icono luna/sol)
- Auto-detección de preferencia del sistema
- Persistencia en localStorage
- Tema emerald primary en ambos modos

### ⌚ Samsung Health / Health Connect
- Conecta tu reloj Samsung o Galaxy Watch
- Lee automáticamente:
  - Pasos diarios
  - Calorías activas y en reposo
  - Distancia recorrida
  - Minutos de actividad moderada+
  - Ritmo cardíaco promedio y máximo
  - Horas de sueño
  - Ejercicios detectados (se registran en ExerciseLog automáticamente)
- En PWA: entrada manual disponible
- En APK: usa Health Connect (Android 14+) o @capacitor-community/health

### 📅 Horarios múltiples por día
- Define bloques de horario diferentes para diferentes días:
  - **Lunes-Viernes**: trabajo 9-18, lunch 14-15
  - **Sábado**: trabajo 10-14, lunch 14-15
  - **Domingo**: día libre (iglesia), lunch 14-15
- Agrega/edita/elimina bloques en el onboarding
- Marca bloques como "día libre" (no trabajo)
- El sistema de notificaciones usa el horario correcto según el día
- La IA personaliza el plan según los múltiples horarios

### 💾 Base de datos (local + nube)
- **Local (SQLite)**: siempre activa, funciona sin internet
- **Nube (Turso)**: opcional, para respaldo y acceso multi-dispositivo
- Todos los logs se marcan como `pending` hasta sincronizar
- Source tracking: `manual` o `voice` para cada log
- Settings para activar/desactivar sync desde la app

### 📊 Dashboard
- Stats de los últimos 7 días
- Gráfico de adherencia al plan (recharts)
- Gráfico de minutos de ejercicio
- Plan del día de hoy
- Feedback reciente de la IA
- Contador de notificaciones pendientes

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Base de datos | Prisma 6 + SQLite (local) + Turso (nube) |
| Estado | Zustand |
| Tema | next-themes (dark/light) |
| Gráficas | Recharts |
| IA | z-ai-web-dev-sdk (chat + ASR) |
| Animaciones | Framer Motion |
| Iconos | Lucide React |
| Notificaciones | Web Push API + Service Worker |

## 🚀 Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai

# 2. Instalar dependencias
bun install  # o: npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Para empezar, deja DATABASE_URL="file:./dev.db" (SQLite local)

# 4. Inicializar base de datos
bun run db:push

# 5. Iniciar servidor de desarrollo
bun run dev

# 6. Abrir http://localhost:3000
```

## ☁️ Configurar Turso (nube)

Para tener tus datos sincronizados entre dispositivos:

### 1. Crear base de datos en Turso
```bash
# Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Crear base de datos
turso db create coachfit

# Obtener URL
turso db show coachfit --url
# → libsql://coachfit-<tu-usuario>.turso.io

# Crear token de acceso
turso db tokens create coachfit
# → eyJhbGciOiJFZERTQSIs...
```

### 2. Actualizar `prisma/schema.prisma`
```prisma
datasource db {
  provider = "libsql"
  url      = env("TURSO_DATABASE_URL")
  directUrl = env("TURSO_AUTH_TOKEN")
}
```

### 3. Instalar adapter de Turso
```bash
bun add @prisma/adapter-libsql @libsql/client
```

### 4. Actualizar `src/lib/db.ts`
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

### 5. Configurar variables de entorno
```bash
# .env
TURSO_DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIs...
DATABASE_URL=libsql://coachfit-<tu-usuario>.turso.io?authToken=<token>
```

### 6. Aplicar schema a Turso
```bash
bun run db:push
```

### 7. Activar sync desde la app
- Abre la app → Ajustes
- Toggle "Activar sync con Turso"
- Click "Sincronizar ahora"

## 📲 Convertir a APK

Esta app está diseñada para convertirse en APK nativo de Android con Capacitor:

### Requisitos
- Node.js 20+ o Bun
- Android Studio instalado
- JDK 17

### Pasos

```bash
# 1. Instalar Capacitor
bun add @capacitor/core @capacitor/cli @capacitor/android
bun add @capacitor/local-notifications  # para notificaciones nativas
bun add @capacitor-community/sqlite     # para DB local en APK

# 2. Cambiar next.config.ts a static export
# En next.config.ts:
# output: "export"

# 3. Construir
bun run build

# 4. Inicializar Capacitor
bunx cap init CoachFitAI com.tuempresa.coachfit --web-dir=out

# 5. Agregar Android
bunx cap add android
bunx cap sync

# 6. Abrir en Android Studio
bunx cap open android

# 7. Build → Build APK en Android Studio
# El APK se genera en: android/app/build/outputs/apk/debug/app-debug.apk
```

### Notificaciones nativas en APK
Para que las notificaciones funcionen en background en APK real, usar Capacitor:

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

### Samsung Health / Health Connect en APK
Para leer datos de Samsung Health nativamente:

```bash
bun add @capacitor-community/health
```

```typescript
// src/lib/health-native.ts
import { Health } from '@capacitor-community/health'

// Pedir permisos
const granted = await Health.requestAuthorization({
  read: [
    'steps', 'calories.active', 'calories.basal', 'distance',
    'activity', 'heart_rate', 'sleep', 'workouts'
  ]
})

if (!granted) throw new Error('Permisos denegados')

// Leer pasos del día
const today = new Date(); today.setHours(0, 0, 0, 0)
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

const stepsData = await Health.querySteps({
  startDate: today,
  endDate: tomorrow,
})

// Enviar al backend
await fetch('/api/health', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: today.toISOString().slice(0, 10),
    steps: stepsData.reduce((sum, d) => sum + d.value, 0),
    // ... otros datos
  })
})
```

**Requisitos en AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.BODY_SENSORS" />
<queries>
  <package android:name="com.samsung.android.app.health" />
  <package android:name="com.google.android.apps.healthdata" />
</queries>
```

### Base de datos local en APK
Para SQLite nativo (mejor performance que Web SQL):

```typescript
import { CapacitorSQLite } from '@capacitor-community/sqlite'

const db = await CapacitorSQLite.createConnection({
  database: 'coachfit',
  version: 1,
})

// Sincronizar con Turso cuando hay internet
// Implementar sync manual o usar ElectricSQL
```

## 📁 Estructura del proyecto

```
coachfit-ai/
├── prisma/
│   └── schema.prisma              # Schema con syncStatus en todas las tablas
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker
│   └── icon-*.png                 # Íconos PWA
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── onboarding/        # POST/GET perfil
│   │   │   ├── plan/generate/     # IA genera plan semanal
│   │   │   ├── log/meal/          # CRUD comidas (con source: manual/voice)
│   │   │   ├── log/exercise/      # CRUD ejercicio
│   │   │   ├── notifications/     # Sistema (sin acción skip)
│   │   │   ├── schedule/          # Programa notificaciones del día
│   │   │   ├── feedback/          # IA feedback diario
│   │   │   ├── stats/             # Estadísticas
│   │   │   ├── settings/          # Configuración
│   │   │   ├── sync/              # Sincronización con Turso ⭐ NUEVO
│   │   │   ├── asr/               # Voz a texto con IA ⭐ NUEVO
│   │   │   └── ai-parse/          # IA interpreta texto hablado ⭐ NUEVO
│   │   ├── layout.tsx             # ThemeProvider + PWA
│   │   └── page.tsx               # Orquestador con ThemeToggle
│   ├── components/
│   │   ├── Onboarding.tsx         # Formulario 5 pasos
│   │   ├── Dashboard.tsx          # Pantalla principal
│   │   ├── PlanView.tsx           # Plan semanal (3 tabs)
│   │   ├── Logger.tsx             # Registro con botón de voz ⭐
│   │   ├── Feedback.tsx           # Feedback IA por día
│   │   ├── Settings.tsx           # Configuración + Cloud Sync ⭐
│   │   ├── NotificationBanner.tsx # Banner sin "Omitir" ⭐
│   │   ├── QuickLog.tsx           # Modal con modo voz ⭐
│   │   ├── VoiceRecorder.tsx      # Grabadora de audio ⭐ NUEVO
│   │   ├── theme-provider.tsx     # next-themes provider ⭐ NUEVO
│   │   └── theme-toggle.tsx       # Toggle dark/light ⭐ NUEVO
│   ├── lib/
│   │   ├── ai.ts                  # IA: planes, feedback, ASR
│   │   ├── db.ts                  # Prisma client
│   │   └── store.ts               # Zustand store
│   └── hooks/
│       └── use-notifications.ts   # Polling de notificaciones
└── scripts/
    └── make_icons.py              # Genera íconos PWA
```

## 🔄 Cómo funciona

### Flujo principal

1. **Onboarding**: 5 pasos con datos del usuario
2. **Generación de plan**: IA crea plan semanal de comidas + ejercicio
3. **Programación de notificaciones**: según horario laboral
4. **Día a día**:
   - Llega la hora de comer → notificación "Hora de comer"
   - Usuario responde:
     - **"Ya lo hice"** → abre Quick Log (texto o voz)
     - **"Responder con voz"** → graba audio → IA transcribe → llena campos
     - **"Más tarde"** → te recuerda en 15 min
   - Si no respondes → te recuerda cada X min (no hay omitir)
5. **Fin del día**: IA genera feedback comparando plan vs realidad

### Voz a texto (ASR)
```
[Usuario toca "Responder con voz"]
       ↓
[VoiceRecorder graba audio del micrófono]
       ↓
[Audio → base64 → POST /api/asr]
       ↓
[z-ai-web-dev-sdk transcribe audio]
       ↓
[Texto transcrito → POST /api/ai-parse]
       ↓
[IA extrae: name, calories, duration, intensity, onPlan]
       ↓
[Campos del formulario se llenan automáticamente]
       ↓
[Usuario verifica y registra]
```

### Sincronización local + nube
```
[Registro en app]
       ↓
[Guarda en SQLite local con syncStatus = "pending"]
       ↓
[Si hay internet y cloudSyncEnabled = true]
       ↓
[POST /api/sync]
       ↓
[Sube registros pendientes a Turso]
       ↓
[Marca como syncStatus = "synced"]
       ↓
[Disponible desde otros dispositivos]
```

## 📸 Screenshots

Las capturas están en `download/`:
- `01-dashboard.png` - Dashboard principal (light)
- `08-settings-dark.png` - Settings en modo oscuro
- `09-notification-voice-dark.png` - Notificación con botón de voz
- `10-voice-modal-dark.png` - Modal de voz en modo oscuro
- `11-logger-light.png` - Logger con botón de voz

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

---

Hecho con ❤️ usando Next.js, Prisma, Turso, next-themes y la IA de Z.ai
