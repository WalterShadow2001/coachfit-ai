'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Loader2, Dumbbell, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

// Icono de Google (SVG)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// Icono de Strava (SVG)
function StravaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
    </svg>
  )
}

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')

  // Verificar si acabamos de volver de Google/Strava OAuth
  useEffect(() => {
    const url = new URL(window.location.href)
    const googleSuccess = url.searchParams.get('google_auth_success')
    const stravaConnected = url.searchParams.get('strava_connected')
    const authError = url.searchParams.get('auth_error')

    if (googleSuccess === 'true') {
      const accessToken = url.searchParams.get('access_token')
      if (accessToken) {
        localStorage.setItem('google_fit_access_token', accessToken)
      }
      const refreshToken = url.searchParams.get('refresh_token')
      if (refreshToken) {
        localStorage.setItem('google_fit_refresh_token', refreshToken)
      }
      toast.success('Sesión iniciada con Google')
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname)
      onAuth()
    }

    if (stravaConnected === 'true') {
      const stravaToken = url.searchParams.get('strava_access_token')
      if (stravaToken) {
        localStorage.setItem('strava_access_token', stravaToken)
      }
      const stravaRefresh = url.searchParams.get('strava_refresh_token')
      if (stravaRefresh) {
        localStorage.setItem('strava_refresh_token', stravaRefresh)
      }
      toast.success('Strava conectado')
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (authError) {
      toast.error('Error de autenticación: ' + authError)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleLogin = async () => {
    if (!loginEmailOrUsername || !loginPassword) {
      toast.error('Llena todos los campos')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: loginEmailOrUsername, password: loginPassword, remember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success(`Bienvenido ${data.user.name || data.user.username}`)
      onAuth()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!regEmail || !regUsername || !regPassword) {
      toast.error('Llena todos los campos')
      return
    }
    if (regPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, username: regUsername, password: regPassword, name: regName || regUsername, remember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success(`Cuenta creada. ¡Bienvenido ${data.user.name || data.user.username}!`)
      onAuth()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = () => {
    window.location.href = '/api/google-auth/login'
  }

  const loginWithStrava = () => {
    window.location.href = '/api/strava/auth'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Dumbbell className="w-9 h-9 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">CoachFit AI</CardTitle>
          <CardDescription>Tu entrenador personal con IA</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Botones de login social */}
          <div className="space-y-2">
            <Button onClick={loginWithGoogle} variant="outline" className="w-full h-11 text-base font-medium">
              <GoogleIcon className="mr-2" />
              Continuar con Google
            </Button>
            <Button onClick={loginWithStrava} variant="outline" className="w-full h-11 text-base font-medium text-[#FC5200]">
              <StravaIcon className="mr-2" />
              Continuar con Strava
            </Button>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <Separator className="flex-1" />
          </div>

          {/* Tabs login/registro */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="login-user">Email o usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="login-user" className="pl-9" value={loginEmailOrUsername} onChange={(e) => setLoginEmailOrUsername(e.target.value)} placeholder="tucorreo@ejemplo.com" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                </div>
              </div>
              <div>
                <Label htmlFor="login-pass">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="login-pass" type={showPassword ? 'text' : 'password'} className="pl-9 pr-9" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Tu contraseña" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                <span className="text-muted-foreground">Mantener sesión abierta en este dispositivo</span>
              </label>
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Entrar
              </Button>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="reg-name">Nombre (opcional)</Label>
                <Input id="reg-name" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Carlos" />
              </div>
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-email" type="email" className="pl-9" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="reg-user">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-user" className="pl-9" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="carlos_fit" />
                </div>
              </div>
              <div>
                <Label htmlFor="reg-pass">Contraseña (mín. 6 caracteres)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-pass" type={showPassword ? 'text' : 'password'} className="pl-9 pr-9" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                <span className="text-muted-foreground">Mantener sesión abierta en este dispositivo</span>
              </label>
              <Button onClick={handleRegister} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Crear cuenta
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Google: entra con tu cuenta y sincroniza Fit automáticamente<br/>
            Strava: importa tus ejercicios de correr, bici, natación, etc.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
