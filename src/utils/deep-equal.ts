import { CustomValue } from '../types/base';
import { CustomObject } from '../types/with-intrinsics';

export function deepEqual(a: CustomValue, b: CustomValue): boolean {
  const stack: [CustomValue, CustomValue][] = [];
  const visited: Set<string> = new Set();

  stack.push([a, b]);

  while (stack.length > 0) {
    const [a, b] = stack.pop();

    visited.add(`${a.id}:${b.id}`);

    if (a instanceof CustomObject) {
      if (!(b instanceof CustomObject)) return false;

      if (Array.isArray(a.value)) {
        if (!Array.isArray(b.value)) return false;
        if (a.value.length !== b.value.length) return false;
        for (let index = 0; index < a.value.length; index++) {
          const valueA = a.value[index];
          const valueB = b.value[index];
          if (!visited.has(`${valueA.id}:${valueB.id}`)) {
            stack.push([valueA, valueB]);
          }
        }
      } else {
        if (a.value.size !== b.value.size) return false;
        for (const key of a.value.keys()) {
          if (!b.value.has(key)) return false;
          const valueA = a.value.get(key);
          const valueB = b.value.get(key);
          if (!visited.has(`${valueA.id}:${valueB.id}`)) {
            stack.push([valueA, valueB]);
          }
        }
      }
    } else if (a.value !== b.value) {
      return false;
    }
  }

  return true;
}
