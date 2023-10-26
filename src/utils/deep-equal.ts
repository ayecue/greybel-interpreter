import { CustomValue } from '../types/base';
import { CustomList } from '../types/list';
import { CustomMap } from '../types/map';
import { CustomObject } from '../types/with-intrinsics';

function equalInner(
  a: CustomValue,
  b: CustomValue,
  maxDepth: number,
  depth: number = 0
) {
  if (maxDepth <= depth) return a === b;
  if (a.value === b.value) return true;

  if (a && b && a instanceof CustomObject && b instanceof CustomObject) {
    if (a.constructor !== b.constructor) return false;

    if (a instanceof CustomList) {
      const length = a.value.length;
      if (length !== b.value.length) return false;
      for (let i = length; i-- !== 0; )
        if (!equalInner(a.value[i], b.value[i], maxDepth, depth + 1))
          return false;
      return true;
    }

    if (a instanceof CustomMap) {
      if (a.value.size !== b.value.size) return false;
      for (const i of a.value.keys()) {
        if (
          !b.value.has(i) ||
          !equalInner(a.value.get(i), b.value.get(i), maxDepth, depth + 1)
        ) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  // true if both NaN, false otherwise
  return Number.isNaN(a.value) && Number.isNaN(b.value);
}

export function deepEqual(a: any, b: any, maxDepth: number = 10) {
  return equalInner(a, b, maxDepth);
}
