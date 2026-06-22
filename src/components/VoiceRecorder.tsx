'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface VoiceRecorderProps {
  onTranscribed: (text: string) => void
  buttonText?: string
  compact?: boolean
  placeholder?: string
}

export default function VoiceRecorder({
  onTranscribed,
  buttonText = 'Responder con voz',
  compact = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [liveText, setLiveText] = useState('')
  const recognitionRef = useRef<any>(null)
  const finalTextRef = useRef<string>('')
  const shouldStopRef = useRef<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      doStop()
      if (timerRef.current) clearInterval(timerRef.current)
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
    }
  }, [])

  const hasWebSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startRecording = async () => {
    if (!hasWebSpeech) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    finalTextRef.current = ''
    shouldStopRef.current = false
    setLiveText('')
    setIsRecording(true)
    setRecordingTime(0)

    // Timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)

    startRecognition()
  }

  const startRecognition = () => {
    try {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognitionClass()
      recognition.lang = 'es-MX'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let interim = ''
        let finalThisRound = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalThisRound += transcript
          } else {
            interim += transcript
          }
        }

        // Agregar texto final
        if (finalThisRound) {
          const clean = finalThisRound.trim()
          if (clean) {
            if (finalTextRef.current && !finalTextRef.current.endsWith(' ')) {
              finalTextRef.current += ' '
            }
            finalTextRef.current += clean
          }
        }

        // Mostrar texto en vivo
        setLiveText(finalTextRef.current + (interim ? ' ' + interim : ''))
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error)
        if (event.error === 'not-allowed') {
          toast.error('Permiso de micrófono denegado')
          doStop()
        } else if (event.error === 'no-speech') {
          // Silencio detectado - se reiniciará automáticamente en onend
        } else if (event.error === 'aborted') {
          // Usuario detuvo
        } else if (event.error === 'network') {
          // Error de red - intentar de nuevo
        }
      }

      recognition.onend = () => {
        // Si el usuario no detuvo manualmente, reiniciar
        if (!shouldStopRef.current) {
          // Pequeña pausa antes de reiniciar
          restartTimeoutRef.current = setTimeout(() => {
            if (!shouldStopRef.current) {
              try {
                recognition.start()
              } catch (e) {
                // Si falla al reiniciar, intentar una vez más
                setTimeout(() => {
                  if (!shouldStopRef.current) {
                    try { recognition.start() } catch {}
                  }
                }, 500)
              }
            }
          }, 100)
        } else {
          // El usuario detuvo - devolver texto
          finishRecording()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e: any) {
      console.error('Recognition start error:', e)
      toast.error('Error al iniciar: ' + e.message)
      doStop()
    }
  }

  const finishRecording = () => {
    const finalText = finalTextRef.current
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.')
      .trim()

    if (finalText && finalText.length > 0) {
      onTranscribed(finalText)
      toast.success('Transcrito: "' + (finalText.length > 50 ? finalText.slice(0, 50) + '...' : finalText) + '"')
    } else {
      toast.error('No te escuché. Intenta hablar más fuerte.')
    }

    setIsRecording(false)
    setLiveText('')
    setRecordingTime(0)
  }

  const doStop = () => {
    shouldStopRef.current = true
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const stopRecording = () => {
    shouldStopRef.current = true
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    // onend se encargará de llamar finishRecording
  }

  if (isRecording) {
    return (
      <div className="space-y-2">
        {/* Texto en vivo */}
        {liveText && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-sm text-emerald-800 dark:text-emerald-200 min-h-[40px] max-h-[120px] overflow-y-auto">
            {liveText}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={stopRecording}
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2 fill-current" />
            Detener ({recordingTime}s)
          </Button>
          <div className="flex items-center gap-1 px-3 py-2 bg-rose-50 dark:bg-rose-950 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
              {recordingTime}s
            </span>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          🔴 Grabando... Habla normal. Toca "Detener" cuando termines.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        onClick={startRecording}
        className={compact ? '' : 'w-full'}
      >
        <Mic className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Toca para empezar, habla, y toca "Detener" cuando termines
      </p>
    </div>
  )
}
