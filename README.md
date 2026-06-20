# 🏋️ CoachFit AI

> Tu entrenador personal con IA que te ayuda a bajar de peso con planes de comida, ejercicio y notificaciones inteligentes.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📋 Tabla de contenidos

- [¿Qué es?](#-qué-es)
- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Instalación local](#-instalación-local)
- [Despliegue](#-despliegue)
- [Convertir a APK](#-convertir-a-apk)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Cómo funciona](#-cómo-funciona)

## 🤖 ¿Qué es?

CoachFit AI es una aplicación web progresiva (PWA) que funciona como un entrenador personal inteligente. A diferencia de otras apps de fitness, esta:

1. **Te hace preguntas** sobre tu peso, objetivo, presupuesto, horario de trabajo y restricciones
2. **Genera un plan semanal** completo con IA: comidas + ejercicio adaptados a ti
3. **Te "molesta" con notificaciones** inteligentes que respetan tu horario laboral
4. **Registra lo que realmente haces** y te da feedback diario comparado con tu plan
5. **Te enseña qué mejorar** con análisis de adherencia y mensajes motivadores

## ✨ Características

### 🧠 IA integrada (z-ai-web-dev-sdk)
- **Plan de comidas semanal**: 7 días con desayuno, lunch, cena y snacks. Incluye ingredientes, calorías y tiempos de preparación.
- **Rutina de ejercicio semanal**: 7 días adaptados a tu equipo y tiempo disponible. Incluye sets, reps, descansos y notas.
- **Feedback diario**: La IA compara tu plan vs lo que registraste, te da un score 0-100, puntos positivos, mejoras y mensaje motivacional.
- **Lista de compras**: Generada automáticamente con costo estimado en MXN.

### 🔔 Notificaciones inteligentes (el "coach que te molesta")
- Solo te notifica en horas libres (respeta tu horario de trabajo)
- Solo te notifica a la hora de comida durante trabajo
- Respeta horas silenciosas (10pm - 7am por defecto)
- Si no respondes → te vuelve a recordar cada X minutos (configurable)
- Máximo de reintentos para no ser excesivamente molesto
- 3 acciones: **"Ya lo hice"** (registra) / **"Más tarde"** (snooze 15 min) / **"Omitir"** (silencia)

### 📊 Dashboard
- Stats de los últimos 7 días
- Gráfico de adherencia al plan
- Gráfico de minutos de ejercicio
- Plan del día de hoy (comidas + ejercicio)
- Feedback reciente de la IA
- Contador de notificaciones pendientes

### 📝 Registro (Logging)
- Registrar comidas (tipo, nombre, calorías, si cumpliste el plan, notas)
- Registrar ejercicio (nombre, duración, intensidad, calorías, notas)
- Modal de Quick Log al responder una notificación
- Historial del día con opción de eliminar

### 📱 PWA + APK-ready
- Instalable en Android/iOS desde el navegador
- Funciona offline (Service Worker)
- Íconos generados automáticamente
- Configurado para conversión a APK con Capacitor

### 💾 Base de datos (Prisma)
- Compatible con SQLite (local) y Turso (cloud)
- Sincronización lista para producción
- Schema completo: perfil, planes, logs, notificaciones, feedback, settings

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Base de datos | Prisma 6 + SQLite/Turso |
| Estado | Zustand |
| Gráficas | Recharts |
| IA | z-ai-web-dev-sdk |
| Animaciones | Framer Motion |
| Iconos | Lucide React |
| Notificaciones | Web Push API + Service Worker |

## 🚀 Instalación local

### Requisitos
- Node.js 20+ o Bun
- npm, pnpm o bun

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/WalterShadow2001/coachfit-ai.git
cd coachfit-ai

# 2. Instalar dependencias
bun install  # o: npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env si necesitas otra URL de base de datos

# 4. Inicializar base de datos
bun run db:push

# 5. Iniciar servidor de desarrollo
bun run dev

# 6. Abrir http://localhost:3000
```

## ☁️ Despliegue

### Vercel (recomendado)

1. Sube el repo a GitHub (ya hecho ✅)
2. Ve a [vercel.com](https://vercel.com) → Import Project
3. Selecciona el repo `coachfit-ai`
4. No necesitas variables de entorno especiales para empezar
5. Click en Deploy

### Turso (base de datos en la nube)

Para tener tus datos sincronizados entre dispositivos:

```bash
# Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Crear base de datos
turso db create coachfit
turso db show coachfit --url
turso db tokens create coachfit
```

Luego actualiza `prisma/schema.prisma` para usar `libsql` y configura las variables en Vercel:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Lee `download/README-INSTALACION.md` para la guía completa.

## 📲 Convertir a APK

La app está lista para convertirse en APK nativo de Android usando Capacitor:

```bash
# 1. Instalar Capacitor
bun add @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar
bunx cap init CoachFitAI com.tuempresa.coachfit --web-dir=out

# 3. Cambiar next.config.ts a output: "export" y construir
bun run build

# 4. Agregar Android
bunx cap add android
bunx cap sync

# 5. Abrir en Android Studio
bunx cap open android

# 6. Build → Build APK en Android Studio
```

Para notificaciones nativas en APK:
```bash
bun add @capacitor/local-notifications @capacitor/push-notifications
```

Guía detallada en `download/README-INSTALACION.md`.

## 📁 Estructura del proyecto

```
coachfit-ai/
├── prisma/
│   └── schema.prisma              # Esquema de base de datos
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker
│   ├── icon-192.png               # Ícono PWA
│   └── icon-512.png               # Ícono PWA
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── onboarding/        # POST/GET perfil usuario
│   │   │   ├── plan/generate/     # IA genera plan semanal
│   │   │   ├── log/meal/          # CRUD comidas
│   │   │   ├── log/exercise/      # CRUD ejercicio
│   │   │   ├── notifications/     # Sistema de notificaciones
│   │   │   ├── schedule/          # Programa notificaciones del día
│   │   │   ├── feedback/          # IA genera feedback diario
│   │   │   ├── stats/             # Estadísticas semanales
│   │   │   └── settings/          # Configuración
│   │   ├── layout.tsx             # Layout con PWA meta
│   │   └── page.tsx               # Orquestador principal
│   ├── components/
│   │   ├── Onboarding.tsx         # Formulario 5 pasos
│   │   ├── Dashboard.tsx          # Pantalla principal
│   │   ├── PlanView.tsx           # Plan semanal (3 tabs)
│   │   ├── Logger.tsx             # Registro comidas/ejercicio
│   │   ├── Feedback.tsx           # Feedback de IA por día
│   │   ├── Settings.tsx           # Configuración
│   │   ├── NotificationBanner.tsx # Banner de notificación activa
│   │   └── QuickLog.tsx           # Modal rápido al responder
│   ├── lib/
│   │   ├── ai.ts                  # Integración con IA
│   │   ├── db.ts                  # Prisma client
│   │   └── store.ts               # Zustand store
│   └── hooks/
│       └── use-notifications.ts   # Polling de notificaciones
├── scripts/
│   └── make_icons.py              # Genera íconos PWA
└── download/
    ├── README-INSTALACION.md      # Guía APK + Vercel + Turso
    └── *.png                      # Screenshots
```

## 🔄 Cómo funciona

### Flujo principal

1. **Onboarding**: El usuario completa 5 pasos con sus datos
2. **Generación de plan**: La IA crea plan semanal de comidas + ejercicio
3. **Programación de notificaciones**: Se programan según horario laboral
4. **Día a día**:
   - Llega la hora de comer → notificación "Hora de comer"
   - Usuario responde "Ya lo hice" → se abre Quick Log
   - Usuario registra qué comió
   - Si no responde → se le recuerda cada X min
5. **Fin del día**: La IA genera feedback comparando plan vs realidad
6. **Revisión**: Usuario ve su score, mejoras y mensaje motivacional

### Sistema de notificaciones

```
[Hora planeada] → Notificación pendiente
        ↓
[Usuario responde?]
        ↓
    Sí → Quick Log → Registrar → Acknowledged
    No → Snooze 15 min → Repetir (max 5 veces)
    Omitir → Skipped → Siguiente evento
```

### IA: ¿Qué genera?

| Cuándo | Qué | Output |
|--------|-----|--------|
| Al terminar onboarding | Plan semanal de comidas | JSON con 7 días × 4 comidas + lista de compras |
| Al terminar onboarding | Plan semanal de ejercicio | JSON con 7 días × ejercicios + calorías |
| Al final del día | Feedback diario | JSON con score, positives, improvements, motivation |
| (Futuro) | Mensajes de notificación | JSON con title y body personalizados |

## 📸 Screenshots

Las capturas están en `download/`:
- `01-dashboard.png` - Dashboard principal
- `02-plan.png` - Vista del plan semanal
- `03-log.png` - Registro de comidas
- `04-coach.png` - Vista del coach
- `05-coach-detail.png` - Detalle de feedback
- `06-notification-banner.png` - Banner de notificación
- `07-quick-log.png` - Modal de Quick Log

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 🙋‍♂️ Soporte

Si tienes preguntas o problemas:
- Abre un [Issue](https://github.com/WalterShadow2001/coachfit-ai/issues)
- Revisa la [guía de instalación](download/README-INSTALACION.md)

---

Hecho con ❤️ usando Next.js, Prisma, Tailwind y la IA de Z.ai
