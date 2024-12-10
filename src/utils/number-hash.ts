export function rotateBits(n: number) {
  return (n >> 1) | (n << 31);
}

export function getNumberHashCode(value: number, offset: number = 0): number {
  let unsigned = value >>> 0;
  unsigned = ((unsigned >> 16) ^ unsigned) * 0x45d9f3b;
  unsigned = ((unsigned >> 16) ^ unsigned) * 0x45d9f3b;
  unsigned = (unsigned >> 16) ^ unsigned;
  return ((offset << 5) - offset + unsigned) | 0;
}
