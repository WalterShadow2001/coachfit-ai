'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import Onboarding from '@/components/Onboarding'
import Dashboard from '@/components/Dashboard'
import PlanView from '@/components/PlanView'
import Logger from '@/components/Logger'
import Feedback from '@/components/Feedback'
import Settings from '@/components/Settings'
import NotificationBanner from '@/components/NotificationBanner'
import QuickLog from '@/components/QuickLog'
import { ThemeToggle } from '@/components/theme-toggle'
import { Dumbbell, LayoutDashboard, Salad, Plus, Sparkles, Settings as SettingsIcon } from 'lucide-react'

export default function Home() {
  const { currentView, setView, hasProfile, setHasProfile } = useAppStore()
  const [checkingProfile, setCheckingProfile] = useState(true)

  // Verificar si ya hay perfil
  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(j => {
        if (j.profile) {
          setHasProfile(true)
          setView('dashboard')
        }
      })
      .catch(() => {})
      .finally(() => setCheckingProfile(false))
  }, [])

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-emerald-600">
          <Dumbbell className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay perfil, mostrar onboarding
  if (!hasProfile) {
    return <Onboarding onDone={() => setHasProfile(true)} />
  }

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
              <p className="text-xs text-muted-foreground leading-tight">Tu coach personal</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'plan' && <PlanView />}
        {currentView === 'log' && <Logger />}
        {currentView === 'feedback' && <Feedback />}
        {currentView === 'settings' && <Settings />}
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
          <NavButton active={currentView === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon className="w-5 h-5" />} label="Ajustes" />
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
        active ? 'text-emerald-600' : 'text-muted-foreground hover:text-foreground'
      } ${highlight ? 'relative' : ''}`}
    >
      {highlight && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-3 mb-0.5 ${active ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {icon}
        </div>
      )}
      {!highlight && icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
