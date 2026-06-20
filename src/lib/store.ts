import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // Estado de navegación
  currentView: 'onboarding' | 'dashboard' | 'plan' | 'log' | 'feedback' | 'settings'
  setView: (v: AppState['currentView']) => void

  // Estado de onboarding
  hasProfile: boolean
  setHasProfile: (v: boolean) => void

  // Notificaciones
  activeNotification: any | null
  setActiveNotification: (n: any | null) => void

  // Registro rápido (cuando respondes notificación)
  quickLogOpen: boolean
  quickLogPayload: any | null
  openQuickLog: (payload: any) => void
  closeQuickLog: () => void

  // Toaster / UI
  notificationsEnabled: boolean
  setNotificationsEnabled: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'onboarding',
      setView: (v) => set({ currentView: v }),

      hasProfile: false,
      setHasProfile: (v) => set({ hasProfile: v }),

      activeNotification: null,
      setActiveNotification: (n) => set({ activeNotification: n }),

      quickLogOpen: false,
      quickLogPayload: null,
      openQuickLog: (payload) => set({ quickLogOpen: true, quickLogPayload: payload }),
      closeQuickLog: () => set({ quickLogOpen: false, quickLogPayload: null }),

      notificationsEnabled: true,
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
    }),
    {
      name: 'coachfit-storage',
    }
  )
)
