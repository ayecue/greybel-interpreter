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
  const cache = new Map<string, number>();
  const generateHash = (s: string) => {
    for (var i = 0, h = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  };

  return (value: string): number => {
    if (value.length === 0) {
      return 0;
    }

    const cachedHash = cache.get(value);

    if (cachedHash !== undefined) {
      return cachedHash;
    }

    const hash = generateHash(value);
    cache.set(value, hash);
    return hash;
  };
})();
