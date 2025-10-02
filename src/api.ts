import { API_BASE } from './config'
import type { Track } from './types'

export type SearchItem = {
  id: string
  title: string
  author?: string | null
  duration?: number | null
  url: string
  thumbnail?: string | null
}

export async function fetchLibrary(): Promise<Track[]> {
  const res = await fetch(`${API_BASE}/api/library`)
  if (!res.ok) throw new Error('No se pudo obtener la biblioteca')
  return res.json()
}

export async function downloadFromYoutube(url: string): Promise<Track> {
  const res = await fetch(`${API_BASE}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteFromLibrary(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/library/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('No se pudo eliminar el archivo')
}

export async function searchYoutube(q: string): Promise<SearchItem[]> {
  const url = new URL(`${API_BASE}/api/search`, window.location.origin)
  url.searchParams.set('q', q)
  const res = await fetch(url.toString().replace(window.location.origin, ''))
  if (!res.ok) throw new Error('Error buscando en YouTube')
  return res.json()
}
