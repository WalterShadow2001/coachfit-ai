'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface VoiceRecorderProps {
  onTranscribed: (text: string) => void
  buttonText?: string
  compact?: boolean
  placeholder?: string
}

/**
 * Componente que graba audio del micrófono y lo transcribe con IA.
 * Estrategia:
 * 1. Intentar Web Speech API (gratis, en navegador, Chrome/Edge)
 * 2. Si no disponible, usar MediaRecorder + API /api/asr (Z.ai SDK)
 * 3. Si falla la API, mostrar error claro
 */
export default function VoiceRecorder({
  onTranscribed,
  buttonText = 'Responder con voz',
  compact = false,
  placeholder,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [method, setMethod] = useState<'webspeech' | 'mediaRecorder' | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')

  useEffect(() => {
    return () => {
      stopRecording(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  // Verificar soporte de Web Speech API
  const hasWebSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startRecording = async () => {
    finalTranscriptRef.current = ''
    setError(null)

    try {
      // 1. Intentar Web Speech API primero (gratis, rápido, en español)
      if (hasWebSpeech) {
        try {
          const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          const recognition = new SpeechRecognitionClass()
          recognition.lang = 'es-MX'
          recognition.continuous = true
          recognition.interimResults = true

          recognition.onresult = (event: any) => {
            let interim = ''
            let final = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                final += transcript
              } else {
                interim += transcript
              }
            }
            finalTranscriptRef.current = finalTranscriptRef.current + final
            // Actualizar nivel de audio con la actividad
            setAudioLevel(interim ? 70 : 30)
          }

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            if (event.error === 'not-allowed') {
              toast.error('Permiso de micrófono denegado')
            } else if (event.error === 'no-speech') {
              // No detectó voz, continuar
            } else {
              toast.error('Error de reconocimiento: ' + event.error)
            }
          }

          recognition.onend = () => {
            // Si terminó y hay transcript, devolverlo
            if (finalTranscriptRef.current.trim()) {
              onTranscribed(finalTranscriptRef.current.trim())
              toast.success('Transcrito ✓ (Web Speech API)')
            }
            setIsRecording(false)
            setAudioLevel(0)
          }

          recognition.start()
          recognitionRef.current = recognition
          setMethod('webspeech')
          setIsRecording(true)
          setAudioLevel(50)
          return
        } catch (e) {
          console.warn('Web Speech API failed, falling back to MediaRecorder:', e)
        }
      }

      // 2. Fallback: MediaRecorder + API /api/asr
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream
      setMethod('mediaRecorder')

      // Audio level meter
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(Math.min(100, avg * 2))
        rafRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        transcribe(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
    } catch (e: any) {
      console.error('Mic error:', e)
      if (e.name === 'NotAllowedError') {
        toast.error('Necesito permiso para usar el micrófono')
      } else if (e.name === 'NotFoundError') {
        toast.error('No se encontró micrófono')
      } else {
        toast.error('Error: ' + e.message)
      }
    }
  }

  const stopRecording = (triggerTranscribe = true) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Web Speech API
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

    // MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!triggerTranscribe) {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      } else {
        mediaRecorderRef.current.stop()
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setIsRecording(false)
    setAudioLevel(0)
  }

  const transcribe = async (blob: Blob) => {
    setIsTranscribing(true)
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any)
      }
      const base64 = btoa(binary)

      const res = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error de transcripción')
      if (data.text && data.text.trim()) {
        onTranscribed(data.text.trim())
        toast.success('Transcrito ✓ (IA Z.ai)')
      } else {
        toast.error('No te escuché bien, intenta de nuevo')
      }
    } catch (e: any) {
      console.error('Transcribe error:', e)
      // Mensaje más claro para el usuario
      if (e.message.includes('fetch')) {
        toast.error('No se pudo conectar con el servicio de IA. Intenta de nuevo.')
      } else {
        toast.error('Error: ' + e.message)
      }
    } finally {
      setIsTranscribing(false)
    }
  }

  const [error, setError] = useState<string | null>(null)

  if (isTranscribing) {
    return (
      <Button disabled className={compact ? '' : 'w-full'}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Transcribiendo...
      </Button>
    )
  }

  if (isRecording) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={() => stopRecording(true)}
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2 fill-current" />
            Detener y transcribir
          </Button>
          <div className="flex items-center gap-1 px-3 py-2 bg-rose-50 dark:bg-rose-950 rounded-lg">
            <div
              className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
              style={{ transform: `scale(${1 + audioLevel / 100})` }}
            />
            <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
              {Math.round(audioLevel)}%
            </span>
          </div>
        </div>
        {method === 'webspeech' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
            🎤 Escuchando con Web Speech API (es-MX) - habla claro
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        onClick={startRecording}
        className={compact ? '' : 'w-full'}
        disabled={isTranscribing}
      >
        <Mic className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>
      {!hasWebSpeech && (
        <p className="text-xs text-muted-foreground text-center">
          ℹ️ Tu navegador no soporta Web Speech API, usando IA Z.ai
        </p>
      )}
    </div>
  )
}

