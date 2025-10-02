export type Track = {
  id: string
  title: string
  author?: string | null
  duration?: number | null
  filename: string
  src: string // URL to audio file
  thumbnail?: string | null
}
