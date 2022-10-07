import CustomValue from '../types/base';
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

    if (Array.isArray(a.value)) {
      const length = a.value.length;
      if (length !== b.value.length) return false;
      for (let i = length; i-- !== 0; )
        if (!equalInner(a.value[i], b.value[i], maxDepth, depth + 1))
          return false;
      return true;
    }

    if (a.value instanceof Map) {
      if (a.value.size !== b.value.size) return false;
      for (const i of a.value.keys())
        if (!b.has(i) || !equalInner(a.get(i), b.get(i), maxDepth, depth + 1))
          return false;
      return true;
    }

    return false;
  }

  // true if both NaN, false otherwise
  return a.value === NaN && b.value === NaN;
}

export default function equal(a: any, b: any, maxDepth: number = 2) {
  return equalInner(a, b, maxDepth);
}
