export function hasIterator<T extends { [Symbol.iterator]?: Function }>(
  obj: T
): boolean {
  return typeof obj[Symbol.iterator] === 'function';
}
