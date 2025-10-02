import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { searchYoutube, type SearchItem, downloadFromYoutube } from '../api'
import type { Track } from '../types'

type Props = {
  onDownloaded?: (t: Track) => void
}

export default function SearchBar({ onDownloaded }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [items, setItems] = useState<SearchItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [hoverIndex, setHoverIndex] = useState(-1)
  const [lastDownloaded, setLastDownloaded] = useState<Track | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // using global toast now; no local state needed for last downloaded

  // Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setItems([]); return }
    setLoading(true)
    setError(null)
    const id = setTimeout(async () => {
      try {
        const res = await searchYoutube(q.trim())
        setItems(res)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [q])

  // Ensure dropdown opens while typing, like Spotify
  useEffect(() => {
    if (q.trim()) setOpen(true)
  }, [q])

  const onDownload = async (url: string) => {
    try {
      setDownloading(true)
      const t = await downloadFromYoutube(url)
      onDownloaded?.(t)
      // Notificar a Library para que recargue la lista
      window.dispatchEvent(new CustomEvent('library:refresh'))
      setOpen(false)
      setQ('')
      // Mostrar aviso persistente con acción para añadir a playlist
      setLastDownloaded(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(false)
    }
  }

  // Keyboard navigation inside input (ArrowUp/Down + Enter)
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || (!items.length && !loading)) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(items.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        onDownload(items[activeIndex].url)
      }
    }
  }

  // Helpers para imágenes con fallback (YouTube)
  const getThumbCandidates = (it: SearchItem) => {
    const list: string[] = []
    if (it.thumbnail) list.push(it.thumbnail)
    if (it.id) {
      const base = `https://i.ytimg.com/vi/${it.id}`
      list.push(
        `${base}/maxresdefault.jpg`,
        `${base}/hqdefault.jpg`,
        `${base}/mqdefault.jpg`,
        `${base}/sddefault.jpg`,
        `${base}/default.jpg`
      )
    }
    return list
  }

  const ThumbImage = ({ item, style }: { item: SearchItem; style?: CSSProperties }) => {
    const [idx, setIdx] = useState(0)
    const candidates = getThumbCandidates(item)
    if (candidates.length === 0) {
      return (
        <div style={{ ...style, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
          {(item.title?.[0] || '?').toUpperCase()}
        </div>
      )
    }
    return (
      <img
        src={candidates[idx]}
        alt={item.title}
        style={style}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setIdx(i => (i + 1 < candidates.length ? i + 1 : i))}
      />
    )
  }

  // Inline styles to mimic Spotify
  const S = {
    root: { position: 'relative' as const, width: '100%', maxWidth: 880, margin: '0 auto' },
    pill: (focused: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: '#121212',
      border: '1px solid #2a2a2a',
      borderRadius: 9999,
      padding: '10px 14px',
      height: 40,
      boxShadow: focused ? '0 0 0 2px #A21515' : 'none',
    }),
    icon: { fontSize: 22, color: '#b3b3b3' },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: '#fff',
      fontSize: 16,
    },
    clear: { background: 'transparent', border: 0, color: '#b3b3b3', cursor: 'pointer' },
    dropdown: {
      position: 'absolute' as const,
      top: 'calc(100% + 8px)',
      left: 0,
      right: 0,
      background: '#181818',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      boxShadow: '0 16px 40px rgba(0,0,0,.5)',
      padding: 8,
      maxHeight: 420,
      overflow: 'auto',
      zIndex: 50,
    },
    title: { padding: '10px 12px', fontSize: 12, textTransform: 'uppercase' as const, color: '#9b9b9b' },
    row: (active: boolean) => ({
      display: 'grid',
      gridTemplateColumns: '56px 1fr auto',
      alignItems: 'center',
      gap: 12,
      padding: 8,
      borderRadius: 8,
      cursor: 'pointer',
      background: active ? '#232323' : 'transparent',
    }),
    thumbWrap: {
      position: 'relative' as const,
      width: 56,
      height: 56,
      borderRadius: 6,
      overflow: 'hidden',
      background: '#333',
    },
    img: { width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: 'center', display: 'block' },
    playBtn: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: 0,
      transition: 'opacity .15s ease, transform .15s ease',
      width: 28,
      height: 28,
      padding: 0,            // evita óvalo por padding del botón
      lineHeight: 0,         // quita altura extra del UA
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: 'none',
      background: '#A21515',
      color: '#000',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,.35)',
    },
    playIcon: {             // icono consistente (Material Symbols)
      fontSize: 18,
      lineHeight: 1,
      display: 'block',
      pointerEvents: 'none' as CSSProperties['pointerEvents'],
      fontVariationSettings: '"FILL" 1, "wght" 600, "opsz" 24'
    } as CSSProperties,
    meta: { minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: 2 },
    titleText: { color: '#fff', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' },
    authorText: { color: '#b3b3b3', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' },
    actionBtn: {
      borderRadius: 9999,
      padding: '6px 10px',
      border: '1px solid #2a2a2a',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
    },
  status: { marginTop: 6, fontSize: 12, color: '#b3b3b3' },
    toast: {
      marginTop: 8,
      background: '#111',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      padding: '8px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    },
    toastTitle: { fontWeight: 600 },
    toastActions: { marginLeft: 'auto', display: 'flex', gap: 8 },
    toastBtn: { borderRadius: 9999, padding: '6px 10px', border: '1px solid #2a2a2a', background: 'transparent', color: '#fff', cursor: 'pointer' }
  }

  return (
    <div className="searchbar" ref={boxRef} style={S.root}>
      <div
        className="search-input"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-dropdown"
        style={S.pill(open)}
      >
        <span className="material-symbols-outlined" style={S.icon}>search</span>
        <input
          ref={inputRef}
          placeholder="¿Qué quieres reproducir?  Ctrl+K"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setActiveIndex(-1) }}
          onKeyDown={onKeyDown}
          style={S.input}
        />
        {q && (
          <button className="clear" onClick={() => { setQ(''); setActiveIndex(-1) }} style={S.clear} title="Limpiar">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {open && (q || loading || error) && (
        <div className="search-dropdown" id="search-dropdown" style={S.dropdown}>
          <div className="title" style={S.title}>Búsquedas recientes</div>
          {loading && <div className="row" style={S.row(false)}>Buscando…</div>}
          {error && <div className="row" style={S.row(false)}>{error}</div>}

          {items.map((it, i) => {
            const showPlay = hoverIndex === i || i === activeIndex
            return (
              <div
                className="row"
                key={it.id}
                style={S.row(i === activeIndex)}
                onMouseEnter={() => { setActiveIndex(i); setHoverIndex(i) }}
                onMouseLeave={() => setHoverIndex(-1)}
              >
                <div style={S.thumbWrap}>
                  {/* imagen centrada */}
                  <ThumbImage item={it} style={S.img} />
                  <button
                    style={{
                      ...S.playBtn,
                      ...(showPlay && !downloading
                        ? { opacity: 1, pointerEvents: 'auto' }
                        : { pointerEvents: 'none' })
                    }}
                    title="Reproducir/Descargar"
                    onClick={() => onDownload(it.url)}
                    disabled={downloading}
                  >
                    <span className="material-symbols-outlined" aria-hidden style={S.playIcon}>
                      {downloading ? 'hourglass_top' : 'play_arrow'}
                    </span>
                  </button>
                </div>

                <div className="meta" style={S.meta}>
                  <strong style={S.titleText}>{it.title}</strong>
                  <small style={S.authorText}>{it.author}</small>
                </div>

                <button
                  className="icon-btn"
                  style={S.actionBtn}
                  title="Descargar"
                  onClick={() => onDownload(it.url)}
                  disabled={downloading}
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    {downloading ? 'hourglass_top' : 'download'}
                  </span>
                </button>
              </div>
            )
          })}

          {(!loading && !error && items.length === 0 && q) && (
            <div className="row" style={S.row(false)}>Sin resultados</div>
          )}
        </div>
      )}

      {downloading && (
        <div className="search-status" style={S.status}>Descargando…</div>
      )}

      {lastDownloaded && (
        <div style={S.toast} role="status" aria-live="polite">
          <span style={S.toastTitle}>Descargado</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastDownloaded.title}
            </div>
            {lastDownloaded.author && (
              <div style={{ color: '#b3b3b3', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastDownloaded.author}
              </div>
            )}
          </div>
          <div style={S.toastActions}>
            <button
              style={S.toastBtn}
              onClick={() => window.playlistAdd?.(lastDownloaded, 'end')}
              title="Añadir al final de la playlist"
            >
              Añadir a Playlist
            </button>
            <button
              style={S.toastBtn}
              onClick={() => setLastDownloaded(null)}
              title="Ocultar"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
