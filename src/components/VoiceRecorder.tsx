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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      stopRecording(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  const hasWebSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startRecording = async () => {
    finalTranscriptRef.current = ''
    setError(null)

    try {
      if (hasWebSpeech) {
        try {
          const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          const recognition = new SpeechRecognitionClass()
          recognition.lang = 'es-MX'
          recognition.continuous = true
          recognition.interimResults = true

          let lastFinalText = ''

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

            // Agregar el texto final de esta ronda con espacio apropiado
            if (finalThisRound) {
              // Limpiar espacios múltiples y agregar espacio entre segmentos
              const cleanText = finalThisRound.trim()
              if (cleanText) {
                if (lastFinalText && !lastFinalText.endsWith(' ')) {
                  finalTranscriptRef.current += ' '
                }
                finalTranscriptRef.current += cleanText
                lastFinalText = cleanText
              }
            }

            // Actualizar nivel de audio basado en actividad
            setAudioLevel(interim ? 70 : 30)
          }

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            if (event.error === 'not-allowed') {
              setError('Permiso de micrófono denegado')
              toast.error('Permiso de micrófono denegado')
              setIsRecording(false)
            } else if (event.error === 'no-speech') {
              // Continuar, no es error crítico
            } else if (event.error === 'aborted') {
              // Usuario detuvo, no es error
            } else if (event.error === 'network') {
              setError('Error de red en reconocimiento')
            } else {
              console.warn('Speech error:', event.error)
            }
          }

          recognition.onend = () => {
            // Si terminó y hay transcript, devolverlo
            const finalText = finalTranscriptRef.current.trim()
            if (finalText) {
              // Limpiar el texto: eliminar espacios múltiples, normalizar
              const cleaned = finalText
                .replace(/\s+/g, ' ')
                .replace(/\s+,/g, ',')
                .replace(/\s+\./g, '.')
                .trim()

              if (cleaned.length > 0) {
                onTranscribed(cleaned)
                toast.success('Transcrito: ' + (cleaned.length > 40 ? cleaned.slice(0, 40) + '...' : cleaned))
              } else {
                toast.error('No te escuché bien, intenta de nuevo')
              }
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

      // Fallback: MediaRecorder + API /api/asr
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

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

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
        toast.success('Transcrito ✓')
      } else {
        toast.error('No te escuché bien, intenta de nuevo')
      }
    } catch (e: any) {
      console.error('Transcribe error:', e)
      if (e.message.includes('fetch')) {
        toast.error('No se pudo conectar con el servicio de IA')
      } else {
        toast.error('Error: ' + e.message)
      }
    } finally {
      setIsTranscribing(false)
    }
  }

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
            🎤 Escuchando (es-MX) - habla claro y pausado
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
