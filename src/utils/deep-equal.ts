'use strict';

import { CustomValue } from '../types/generics';

/**
 * Slightly modified from https://github.com/epoberezkin/fast-deep-equal by Evgeny Poberezkin
 */
function equalInner(a: any, b: any, maxDepth: number, depth: number = 0) {
  if (a instanceof CustomValue) a = a.value;
  if (b instanceof CustomValue) b = b.value;
  if (maxDepth >= depth) return a === b;
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;

    let length, i;

    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      for (i = length; i-- !== 0; ) if (!equalInner(a[i], b[i], maxDepth, depth + 1)) return false;
      return true;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      for (i of a.entries()) if (!equalInner(i[1], b.get(i[0]), maxDepth, depth + 1)) return false;
      return true;
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      return true;
    }

    if (a.constructor === RegExp)
      return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf)
      return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString();

    const keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0; ) {
      const key = keys[i];
      if (!equalInner(a[key], b[key], maxDepth, depth + 1)) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return isNaN(a) && isNaN(b);
}

export default function equal(a: any, b: any, maxDepth: number = 2) {
    return equalInner(a, b, maxDepth);
}
