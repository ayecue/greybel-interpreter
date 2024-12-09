import MurmurHash3 from 'imurmurhash';

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

export const getStringHashCode = (str: string) => {
  return MurmurHash3(str).result();
}
