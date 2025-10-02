import DoublyLinkedList from './DoublyLinkedList'
import type { Track } from '../types'

export default class PlaylistManager {
  private list = new DoublyLinkedList<Track>()

  get size() {
    return this.list.length
  }

  toArray(): Track[] {
    return this.list.toArray()
  }

  addStart(track: Track) {
    this.list.addFirst(track)
  }

  addEnd(track: Track) {
    this.list.addLast(track)
  }

  insertAt(index: number, track: Track) {
    this.list.insertAt(index, track)
  }

  removeAt(index: number): Track | undefined {
    return this.list.removeAt(index)
  }
}
