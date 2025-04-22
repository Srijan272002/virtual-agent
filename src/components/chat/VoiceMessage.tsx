import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface VoiceMessageProps {
  mode: 'record' | 'playback'
  audioUrl?: string
  onRecordingComplete?: (blob: Blob) => void
  className?: string
}

export function VoiceMessage({ mode, audioUrl, onRecordingComplete, className }: VoiceMessageProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (mode === 'playback' && audioUrl) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0)
      })
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      })
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [mode, audioUrl])

  const startRecording = async () => {
    setIsLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        onRecordingComplete?.(audioBlob)
        setRecordingTime(0)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      clearInterval(recordingTimerRef.current)
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (mode === 'record') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant={isRecording ? "destructive" : "secondary"}
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        {isRecording && (
          <span className="text-sm text-muted-foreground">
            {formatTime(recordingTime)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-[200px]", className)}>
      <Button
        variant="secondary"
        size="icon"
        onClick={togglePlayback}
        disabled={!audioUrl}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1">
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSliderChange}
          disabled={!audioUrl}
        />
      </div>
      <span className="text-sm text-muted-foreground min-w-[40px]">
        {formatTime(currentTime)}
      </span>
    </div>
  )
} 