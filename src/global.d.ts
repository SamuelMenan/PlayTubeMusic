import type { Track } from './types'

type ToastOptions = {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

declare global {
  interface Window {
    playlistAdd?: (t: Track, p?: 'start' | 'end' | { index: number }) => void
    showToast?: (o: ToastOptions) => void
  }
}

export {}

