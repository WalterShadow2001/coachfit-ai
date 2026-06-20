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
 * Maneja permisos, errores y estado de grabación.
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      stopRecording(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!triggerTranscribe) {
        // si cancelamos sin transcribir, removemos el onstop
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
        toast.success('Transcrito ✓')
      } else {
        toast.error('No te escuché bien, intenta de nuevo')
      }
    } catch (e: any) {
      console.error('Transcribe error:', e)
      toast.error('Error: ' + e.message)
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
    )
  }

  return (
    <Button
      variant="outline"
      onClick={startRecording}
      className={compact ? '' : 'w-full'}
      disabled={isTranscribing}
    >
      <Mic className="w-4 h-4 mr-2" />
      {buttonText}
    </Button>
  )
}
