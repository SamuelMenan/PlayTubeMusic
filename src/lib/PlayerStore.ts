import type { Track } from '../types'

export type PlayerState = {
  tracks: Track[]
  currentIndex: number
  playing: boolean
}

class PlayerStore {
  private _state: PlayerState = { tracks: [], currentIndex: -1, playing: false }
  private listeners = new Set<(s: PlayerState) => void>()

  subscribe(fn: (s: PlayerState) => void) {
    this.listeners.add(fn)
    fn(this._state)
    return () => { this.listeners.delete(fn) }
  }

  private notify() { for (const l of this.listeners) l(this._state) }

  get state() { return this._state }

  setTracks(tracks: Track[]) {
    this._state.tracks = tracks
    if (tracks.length === 0) this._state.currentIndex = -1
    else if (this._state.currentIndex < 0) this._state.currentIndex = 0
    else if (this._state.currentIndex >= tracks.length) this._state.currentIndex = tracks.length - 1
    this.notify()
  }

  setPlaying(playing: boolean) { this._state.playing = playing; this.notify() }

  togglePlay() { this.setPlaying(!this._state.playing) }

  togglePlayIndex(index: number) {
    if (index === this._state.currentIndex) this.togglePlay()
    else { this._state.currentIndex = index; this._state.playing = true; this.notify() }
  }

  setCurrent(index: number) {
    if (index >= 0 && index < this._state.tracks.length) {
      this._state.currentIndex = index
      this.notify()
    }
  }

  next() {
    const n = this._state.currentIndex + 1
    if (n < this._state.tracks.length) { this._state.currentIndex = n; this._state.playing = true; this.notify() }
  }
  prev() {
    const p = this._state.currentIndex - 1
    if (p >= 0) { this._state.currentIndex = p; this._state.playing = true; this.notify() }
  }
}

export const playerStore = new PlayerStore()
