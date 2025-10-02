import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import PlaylistManager from '../lib/PlaylistManager'
import type { Track } from '../types'
import { playerStore } from '../lib/PlayerStore'

export default function Playlist() {
  const manager = useMemo(() => new PlaylistManager(), [])
  const [items, setItems] = useState<Track[]>([])
  const [current, setCurrent] = useState<number>(-1)
  const [playing, setPlaying] = useState(false)

  const refresh = () => setItems(manager.toArray())

  const add = (t: Track, position?: 'start' | 'end' | { index: number }) => {
    if (!position || position === 'end') manager.addEnd(t)
    else if (position === 'start') manager.addStart(t)
    else manager.insertAt(position.index, t)
    if (current === -1) setCurrent(0)
    refresh()
    playerStore.setTracks(manager.toArray())
  }

  // Exponer función de añadir para que la Biblioteca pueda usarla
  window.playlistAdd = add

  const remove = (idx: number) => {
    manager.removeAt(idx)
    if (idx === current) setCurrent((c) => Math.min(c, manager.size - 1))
    refresh()
    playerStore.setTracks(manager.toArray())
  }

  const togglePlayForIndex = (idx: number) => {
    if (idx === current) playerStore.togglePlay()
    else playerStore.togglePlayIndex(idx)
  }

  // Sync local display state to player store
  useEffect(() => {
    const unsub = playerStore.subscribe((s) => {
      setCurrent(s.currentIndex)
      setPlaying(s.playing)
    })
    // initialize tracks if any loaded before
    playerStore.setTracks(manager.toArray())
    return () => unsub()
  }, [manager])

  // Inline styles to guarantee layout and thumbnail visibility
  const S: Record<string, CSSProperties> = {
    list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 12, alignItems: 'center' },
  item: { display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 12, alignItems: 'center', width: '100%', maxWidth: 920, padding: '8px 12px', borderRadius: 12, background: 'var(--surface-2, #131313)', boxSizing: 'border-box' },
    active: { boxShadow: 'inset 0 0 0 2px var(--brand, #A21515)', background: 'var(--surface-3, #1a1a1a)' },
    thumbWrap: { position: 'relative' as const, width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#222', color: '#fff', flex: '0 0 64px' },
    img: { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' },
    overlayBtn: { position: 'absolute' as const, inset: 0, display: 'grid', placeItems: 'center', border: 'none', background: 'linear-gradient(transparent, rgba(0,0,0,.35))', color: '#fff', cursor: 'pointer' },
    meta: { minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: 4 },
    title: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    author: { opacity: .75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }
  }

  // derive whether index is active via current value

  return (
    <section>
      <h2>Lista de reproducción</h2>
      {items.length === 0 && <p>Sin canciones. Usa la Biblioteca para agregar.</p>}
      <ul className="playlist" style={S.list}>
        {items.map((t, i) => (
          <li
            key={`${t.filename}-${i}`}
            className={i === current ? 'active' : ''}
            style={{ ...S.item, ...(i === current ? S.active : {}) }}
          >
            {/* Left: thumbnail with play overlay (ensures the image is visible) */}
            <div style={S.thumbWrap}>
              {t.thumbnail ? (
                <img style={S.img} src={t.thumbnail} alt={t.title || 'thumb'} />
              ) : (
                <span style={{ display: 'grid', placeItems: 'center', height: '100%', fontWeight: 700, fontSize: 20 }}>
                  {(t.title?.[0] || '?').toUpperCase()}
                </span>
              )}
              <button
                style={S.overlayBtn}
                onClick={() => togglePlayForIndex(i)}
                title={`${t.title}${t.author ? ` — ${t.author}` : ''}`}
              >
                <span className="material-symbols-outlined">
                  {i === current ? (playing ? 'pause' : 'play_arrow') : 'play_circle'}
                </span>
              </button>
            </div>

            {/* Middle: meta expands and uses the available space */}
            <div className="meta" style={S.meta}>
              <strong style={S.title}>{t.title}</strong>
              <small style={S.author}>{t.author}</small>
            </div>

            {/* Right: actions */}
            <button className="danger icon-btn" title="Eliminar" onClick={() => remove(i)}>
              <span className="material-symbols-outlined" aria-hidden>delete</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Transport moved to global PlayerBar */}
    </section>
  )
}
