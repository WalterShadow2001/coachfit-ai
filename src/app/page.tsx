'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import AuthScreen from '@/components/AuthScreen'
import Onboarding from '@/components/Onboarding'
import Dashboard from '@/components/Dashboard'
import PlanView from '@/components/PlanView'
import Logger from '@/components/Logger'
import Feedback from '@/components/Feedback'
import Profile from '@/components/Profile'
import NotificationBanner from '@/components/NotificationBanner'
import QuickLog from '@/components/QuickLog'
import { ThemeToggle } from '@/components/theme-toggle'
import { Dumbbell, LayoutDashboard, Salad, Plus, Sparkles, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function Home() {
  const { currentView, setView, hasProfile, setHasProfile } = useAppStore()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)

  // 1. Verificar sesión
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.user) {
          setUser(j.user)
          // Si tiene profile, marcar como completado
          if (j.user.profile) {
            setHasProfile(true)
            setView('dashboard')
          } else {
            setHasProfile(false)
            setView('onboarding')
          }
        } else {
          setUser(null)
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false))
  }, [])

  // 2. Si hay sesión pero queremos verificar profile de nuevo
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.profile) {
          setHasProfile(true)
          if (currentView === 'onboarding') setView('dashboard')
        } else {
          setHasProfile(false)
          setView('onboarding')
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingProfile(false)
      })
    return () => { cancelled = true }
  }, [user])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setHasProfile(false)
      setView('onboarding')
      toast.success('Sesión cerrada')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  // Pantalla de carga
  if (checkingAuth || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">
          <Dumbbell className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Cargando CoachFit AI...</p>
        </div>
      </div>
    )
  }

  // No hay sesión → mostrar login/registro
  if (!user) {
    return <AuthScreen onAuth={() => {
      // Recargar para obtener la sesión
      window.location.reload()
    }} />
  }

  // Hay sesión pero no hay profile → onboarding
  if (!hasProfile) {
    return <Onboarding onDone={() => setHasProfile(true)} />
  }

  // Hay sesión y profile → app principal
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">CoachFit AI</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Hola, {user.name || user.username}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'plan' && <PlanView />}
        {currentView === 'log' && <Logger />}
        {currentView === 'feedback' && <Feedback />}
        {currentView === 'profile' && <Profile />}
      </main>

      {/* Notificación activa */}
      <NotificationBanner />
      {/* Quick log modal */}
      <QuickLog />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t">
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1 p-2 pb-[env(safe-area-inset-bottom)]">
          <NavButton active={currentView === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label="Inicio" />
          <NavButton active={currentView === 'plan'} onClick={() => setView('plan')} icon={<Salad className="w-5 h-5" />} label="Plan" />
          <NavButton active={currentView === 'log'} onClick={() => setView('log')} icon={<Plus className="w-6 h-6" />} label="Registrar" highlight />
          <NavButton active={currentView === 'feedback'} onClick={() => setView('feedback')} icon={<Sparkles className="w-5 h-5" />} label="Coach" />
          <NavButton active={currentView === 'profile'} onClick={() => setView('profile')} icon={<User className="w-5 h-5" />} label="Perfil" />
        </div>
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, icon, label, highlight }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      } ${highlight ? 'relative' : ''}`}
    >
      {highlight && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-3 mb-0.5 ${active ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}>
          {icon}
        </div>
      )}
      {!highlight && icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
