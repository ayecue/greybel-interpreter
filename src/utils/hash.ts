import { LRUCache } from 'lru-cache';

export function rotateBits(n: number) {
  return (n >> 1) | (n << 31);
}

export function getHashCode(value: number, offset: number = 0): number {
  let unsigned = value >>> 0;
  unsigned = ((unsigned >> 16) ^ unsigned) * 0x45d9f3b;
  unsigned = ((unsigned >> 16) ^ unsigned) * 0x45d9f3b;
  unsigned = (unsigned >> 16) ^ unsigned;
  return ((offset << 5) - offset + unsigned) | 0;
}

export const getStringHashCode = (function () {
  const cache = new LRUCache<string, number>({
    ttl: 1000 * 60 * 5,
    max: 500
  });
  const generateHash = (value: string) => {
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
      const chr = value.charCodeAt(i);
      hash = getHashCode(chr, hash);
    }

    return hash;
  };

  return (value: string): number => {
    if (value.length === 0) {
      return 0;
    }

    if (cache.has(value)) {
      return cache.get(value);
    }

    const hash = generateHash(value);
    cache.set(value, hash);
    return hash;
  };
})();
