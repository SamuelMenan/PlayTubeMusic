import { useEffect, useRef, useState } from 'react'

type ToastOptions = {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

export default function Toast() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ToastOptions | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    // expose global helper
    window.showToast = (o: ToastOptions) => {
      setOpts(o)
      setOpen(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      const dur = o.durationMs ?? 3800
      timerRef.current = window.setTimeout(() => setOpen(false), dur)
    }
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); delete window.showToast }
  }, [])

  if (!open || !opts) return null

  return (
    <div className="toast-root">
      <div className="toast">
        <div className="toast-body">
          <span className="material-symbols-outlined" aria-hidden>check_circle</span>
          <div className="toast-text">
            <strong className="toast-title">{opts.title}</strong>
            {opts.message && <small className="toast-msg">{opts.message}</small>}
          </div>
        </div>
        <div className="toast-actions">
          {opts.actionLabel && (
            <button className="toast-btn" onClick={() => { opts.onAction?.(); setOpen(false) }}>
              {opts.actionLabel}
            </button>
          )}
          <button className="toast-btn" aria-label="Cerrar" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined" aria-hidden>close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
