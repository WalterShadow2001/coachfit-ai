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
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      stopRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        // Solo transcribir si hay más de 0.5 segundos de audio
        if (blob.size > 1000) {
          transcribe(blob)
        } else {
          toast.error('Grabación muy corta. Mantén presionado y habla más.')
        }
      }

      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingTime(0)

      // Timer para mostrar duración
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (e: any) {
      console.error('Mic error:', e)
      if (e.name === 'NotAllowedError') {
        toast.error('Necesito permiso para usar el micrófono. Actívalo en los ajustes del navegador.')
      } else if (e.name === 'NotFoundError') {
        toast.error('No se encontró micrófono en este dispositivo')
      } else {
        toast.error('Error: ' + e.message)
      }
    }
  }

  const stopRecording = (triggerTranscribe = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
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
    setIsRecording(false)
    setRecordingTime(0)
  }

  const transcribe = async (blob: Blob) => {
    setIsTranscribing(true)
    try {
      // Convertir a base64
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
        toast.success('Transcrito: "' + (data.text.length > 40 ? data.text.slice(0, 40) + '...' : data.text) + '"')
      } else {
        toast.error('No te escuché bien. Intenta hablar más cerca del micrófono.')
      }
    } catch (e: any) {
      console.error('Transcribe error:', e)
      if (e.message.includes('fetch') || e.message.includes('network')) {
        toast.error('No se pudo conectar con el servicio de IA. Verifica tu conexión.')
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
        Transcribiendo con IA...
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
          🔴 Grabando... Toca "Detener" cuando termines de hablar
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
        disabled={isTranscribing}
      >
        <Mic className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Toca para empezar a grabar, habla, y toca "Detener" cuando termines
      </p>
    </div>
  )
}
