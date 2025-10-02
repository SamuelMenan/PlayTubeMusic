import type { Track } from './types'

declare global {
  interface Window {
    playlistAdd?: (t: Track, p?: 'start' | 'end' | { index: number }) => void
  }
}

export {}
