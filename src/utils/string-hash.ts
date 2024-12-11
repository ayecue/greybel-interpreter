import MurmurHash3 from 'imurmurhash';

import { LRUCache } from './lru-cache';

const CACHE = new LRUCache<string, number>(1000);

export function getStringHashCode(str: string) {
  const cachedHash = CACHE.get(str);
  if (cachedHash) {
    return cachedHash;
  }
  const hash = MurmurHash3(str).result();
  CACHE.set(str, hash);
  return hash;
}
