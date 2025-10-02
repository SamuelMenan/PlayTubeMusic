export class Node<T> {
  value: T
  next: Node<T> | null = null
  prev: Node<T> | null = null
  constructor(value: T) {
    this.value = value
  }
}

export default class DoublyLinkedList<T> {
  head: Node<T> | null = null
  tail: Node<T> | null = null
  length = 0

  addFirst(value: T) {
    const node = new Node(value)
    if (!this.head) {
      this.head = this.tail = node
    } else {
      node.next = this.head
      this.head.prev = node
      this.head = node
    }
    this.length++
    return node
  }

  addLast(value: T) {
    const node = new Node(value)
    if (!this.tail) {
      this.head = this.tail = node
    } else {
      node.prev = this.tail
      this.tail.next = node
      this.tail = node
    }
    this.length++
    return node
  }

  insertAt(index: number, value: T) {
    if (index <= 0) return this.addFirst(value)
    if (index >= this.length) return this.addLast(value)
    // walk to index
    let i = 0
    let cur = this.head
    while (cur && i < index) {
      cur = cur.next
      i++
    }
    if (!cur) return this.addLast(value)
    const node = new Node(value)
    node.prev = cur.prev
    node.next = cur
    if (cur.prev) cur.prev.next = node
    cur.prev = node
    if (index === 0) this.head = node
    this.length++
    return node
  }

  removeAt(index: number): T | undefined {
    if (index < 0 || index >= this.length || !this.head) return undefined
    let cur: Node<T> | null = this.head
    let i = 0
    while (cur && i < index) {
      cur = cur.next
      i++
    }
    if (!cur) return undefined
    if (cur.prev) cur.prev.next = cur.next
    else this.head = cur.next
    if (cur.next) cur.next.prev = cur.prev
    else this.tail = cur.prev
    this.length--
    return cur.value
  }

  toArray(): T[] {
    const out: T[] = []
    let cur = this.head
    while (cur) {
      out.push(cur.value)
      cur = cur.next
    }
    return out
  }
}
