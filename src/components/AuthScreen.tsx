'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Dumbbell, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Login fields
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')

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
        body: JSON.stringify({
          emailOrUsername: loginEmailOrUsername,
          password: loginPassword,
        }),
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
        body: JSON.stringify({
          email: regEmail,
          username: regUsername,
          password: regPassword,
          name: regName || regUsername,
        }),
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

        <CardContent>
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
                  <Input
                    id="login-user"
                    className="pl-9"
                    value={loginEmailOrUsername}
                    onChange={(e) => setLoginEmailOrUsername(e.target.value)}
                    placeholder="tucorreo@ejemplo.com o tu_usuario"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="login-pass">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-9"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Entrar
              </Button>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="reg-name">Nombre (opcional)</Label>
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Carlos"
                />
              </div>
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    className="pl-9"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reg-user">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-user"
                    className="pl-9"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="carlos_fit"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reg-pass">Contraseña (mín. 6 caracteres)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-9"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleRegister} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Crear cuenta
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Tus datos se guardan de forma segura en la nube (Turso)
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
