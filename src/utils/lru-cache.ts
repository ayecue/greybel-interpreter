type CacheNode<K, T> = [K, T, CacheNode<K, T> | null, CacheNode<K, T> | null];

const KEY_INDEX = 0 as const;
const VALUE_INDEX = 1 as const;
const PREV_INDEX = 2 as const;
const NEXT_INDEX = 3 as const;

export class LRUCache<K, T> {
  private _capacity: number;
  private _head: CacheNode<K, T> | null;
  private _tail: CacheNode<K, T> | null;
  private _cache: Map<K, CacheNode<K, T>>;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error(
        'Unexpected _capacity value. _capacity needs to be at least 1.'
      );
    }

    this._capacity = capacity;
    this._head = null;
    this._tail = null;
    this._cache = new Map();
  }

  private moveNodeToHead(node: CacheNode<K, T>): void {
    if (node[NEXT_INDEX]) {
      if (node[PREV_INDEX]) {
        node[NEXT_INDEX][PREV_INDEX] = node[PREV_INDEX];
      } else {
        this._head = node[NEXT_INDEX];
      }
    }

    if (node[PREV_INDEX]) {
      if (node[NEXT_INDEX]) {
        node[PREV_INDEX][NEXT_INDEX] = node[NEXT_INDEX];
      } else {
        this._tail = node[PREV_INDEX];
      }
    }

    const headNode = this._head;
    this._head = node;
    node[PREV_INDEX] = null;
    node[NEXT_INDEX] = headNode;
  }

  get(key: K): T | null {
    const node = this._cache.get(key);

    if (!node) {
      return null;
    }

    this.moveNodeToHead(node);

    return node[VALUE_INDEX];
  }

  set(key: K, value: T): void {
    if (this._cache.size >= this._capacity) {
      const lastNode = this._tail!;
      this._tail = lastNode[PREV_INDEX];
      this._cache.delete(lastNode[KEY_INDEX]);
    }
    const headNode = this._head!;
    this._head = [key, value, null, headNode];
    if (this._tail === null) {
      this._tail = this._head;
    } else {
      headNode[PREV_INDEX] = this._head;
    }
    this._cache.set(key, this._head);
  }
}
