import { useEffect, useMemo, useRef, useState } from 'react'
import { playerStore } from '../lib/PlayerStore'

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [time, setTime] = useState({ current: 0, duration: 0 })
  const [vol, setVol] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)

  const [, force] = useState(0)
  const store = useMemo(() => playerStore, [])

  useEffect(() => {
    const unsub = store.subscribe(() => force(x => x + 1))
    return () => unsub()
  }, [store])

  const state = store.state
  const current = state.currentIndex >= 0 ? state.tracks[state.currentIndex] : undefined

  // Wire audio element to store state
  // Apply volume changes without touching the source or playback state
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol
  }, [vol])

  // Apply mute state to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!current) {
      audio.pause()
      setTime({ current: 0, duration: 0 })
      return
    }
    // Normalize target src to an absolute URL to compare reliably with audio.src
    const targetSrc = new URL(current.src, window.location.href).toString()
    if (audio.src !== targetSrc) {
      audio.src = targetSrc
    }
    const apply = async () => {
      try {
        if (state.playing) await audio.play()
        else audio.pause()
      } catch {
        // ignore autoplay errors until user interacts
      }
    }
    apply()
  }, [current, state.playing])

  const onTime = () => {
    const a = audioRef.current
    if (!a) return
    setTime({ current: a.currentTime || 0, duration: a.duration || 0 })
  }

  const seek = (v: number) => {
    const a = audioRef.current
    if (!a || !Number.isFinite(v)) return
    a.currentTime = v
  }

  const setVolume = (v: number) => {
    setVol(v)
    if (audioRef.current) audioRef.current.volume = v
    // If user increases volume while muted, auto-unmute
    if (muted && v > 0) setMuted(false)
  }

  const prevVolRef = useRef(vol)
  const toggleMute = () => {
    if (!muted) {
      // store current volume before muting
      prevVolRef.current = vol
      setMuted(true)
    } else {
      setMuted(false)
      // if current volume is zero, restore previous volume if available
      if (vol === 0 && prevVolRef.current > 0) {
        setVolume(prevVolRef.current)
      }
    }
  }

  const volumeIcon = useMemo(() => {
    if (muted || vol === 0) return 'volume_off'
    if (vol < 0.5) return 'volume_down'
    return 'volume_up'
  }, [muted, vol])

  return (
    <div className="player-bar">
      <div className="pb-left">
        {current?.thumbnail && (
          <img className="pb-art" src={current.thumbnail} alt={current.title || 'art'} />
        )}
        <div className="pb-meta">
          <strong>{current?.title || 'Sin canción'}</strong>
          <small>{current?.author}</small>
        </div>
      </div>

      <div className="pb-center">
        <div className="pb-controls">
          <button className={shuffle ? 'active' : ''} onClick={() => setShuffle(s => !s)} title="Aleatorio">
            <span className="material-symbols-outlined">shuffle</span>
          </button>
          <button onClick={() => store.prev()} title="Anterior">
            <span className="material-symbols-outlined">skip_previous</span>
          </button>
          <button className="pb-play" onClick={() => store.togglePlay()} title="Reproducir/Pausar">
            <span className="material-symbols-outlined">{state.playing ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={() => store.next()} title="Siguiente">
            <span className="material-symbols-outlined">skip_next</span>
          </button>
          <button className={repeat ? 'active' : ''} onClick={() => setRepeat(r => !r)} title="Repetir">
            <span className="material-symbols-outlined">repeat</span>
          </button>
        </div>
        <div className="pb-progress">
          <span className="time">{formatTime(time.current)}</span>
          <input
            type="range"
            min={0}
            max={Number.isFinite(time.duration) && time.duration > 0 ? time.duration : 0}
            step={0.5}
            value={Math.min(time.current, time.duration || 0)}
            onChange={(e) => seek(Number(e.currentTarget.value))}
          />
          <span className="time">{formatTime(time.duration)}</span>
        </div>
      </div>

      <div className="pb-right">
        <button className="vol" onClick={toggleMute} title={muted || vol === 0 ? 'Reactivar sonido' : 'Silenciar'}>
          <span className="material-symbols-outlined" aria-hidden>
            {volumeIcon}
          </span>
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVolume(Number(e.currentTarget.value))}
          style={{ width: 100 }}
        />
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onEnded={() => {
          if (repeat) {
            const a = audioRef.current
            if (a) { a.currentTime = 0; a.play().catch(() => {}) }
          } else if (shuffle) {
            const count = store.state.tracks.length
            if (count > 0) store.setCurrent(Math.floor(Math.random() * count))
          } else {
            store.next()
          }
        }}
      />
    </div>
  )
}
