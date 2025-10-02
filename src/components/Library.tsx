import { useEffect, useState } from 'react'
import { fetchLibrary, downloadFromYoutube, deleteFromLibrary } from '../api'
import type { Track } from '../types'

type Props = {
  onAdd: (track: Track, position?: 'start' | 'end' | { index: number }) => void
}

export default function Library({ onAdd }: Props) {
  const [items, setItems] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const data = await fetchLibrary()
      setItems(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const onRefresh = () => { load() }
    window.addEventListener('library:refresh', onRefresh as EventListener)
    return () => window.removeEventListener('library:refresh', onRefresh as EventListener)
  }, [])

  const onDownload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      setLoading(true)
      setError(null)
  await downloadFromYoutube(url.trim())
      setUrl('')
      await load()
  // No auto-agregar a playlist; solo refrescar biblioteca
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>Biblioteca</h2>
      <form onSubmit={onDownload} className="row">
        <input
          type="url"
          placeholder="URL de YouTube"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          className="icon-btn"
          disabled={loading}
          title={loading ? 'Descargando…' : 'Descargar'}
          aria-label={loading ? 'Descargando…' : 'Descargar'}
          aria-busy={loading}
        >
          <span className="material-symbols-outlined" aria-hidden>
            {loading ? 'hourglass_top' : 'download'}
          </span>
        </button>
      </form>
      {error && <p className="error">{error}</p>}
  {loading && <p className="muted">Descargando…</p>}
      <ul className="library">
        {items.map((t) => (
          <li key={t.filename}>
            {t.thumbnail && (
              <img
                src={t.thumbnail}
                alt={t.title || 'thumb'}
                title={`${t.title}${t.author ? ` — ${t.author}` : ''}`}
              />
            )}
            <div className="meta">
              <strong>{t.title}</strong>
              <small>{t.author}</small>
            </div>
            <div className="actions">
              <button onClick={() => onAdd(t, 'start')}>
                <span className="material-symbols-outlined" aria-hidden>first_page</span> Agregar al inicio
              </button>
              <button onClick={() => onAdd(t, 'end')}>
                <span className="material-symbols-outlined" aria-hidden>last_page</span> Agregar al final
              </button>
              <button onClick={() => {
                const raw = prompt('Agregar en posición (0 es inicio):', '0')
                if (raw === null) return
                const idx = Number.parseInt(raw, 10)
                if (!Number.isNaN(idx) && idx >= 0) onAdd(t, { index: idx })
              }}>Agregar en posición…</button>
              <button
                className="danger icon-btn"
                title="Eliminar"
                onClick={async () => { await deleteFromLibrary(t.filename); await load() }}
              >
                <span className="material-symbols-outlined" aria-hidden>delete</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
