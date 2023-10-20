export function getHashCode(value: number, offset: number = 0): number {
  if (value === 0.0) return 0;
  return ((offset << 5) - offset + value) | 0;
}

export function getStringHashCode(value: string): number {
  let hash = 0;

  if (value.length === 0) {
    return hash;
  }

  for (let i = 0; i < value.length; i++) {
    const chr = value.charCodeAt(i);
    hash = getHashCode(chr, hash);
  }

  return hash;
}