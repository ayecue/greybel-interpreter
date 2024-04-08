import { CustomValue } from '../types/base';
import { CustomObject } from '../types/with-intrinsics';
import { getHashCode, rotateBits } from './hash';

export function hash(value: CustomValue): number {
  const valueType = typeof value.value;

  switch (valueType) {
    case 'string':
    case 'number':
    case 'boolean':
      return value.hash();
  }

  return deepHash(value);
}

export function deepHash(value: CustomValue): number {
  let result = 0;
  const stack: CustomValue[][] = [];
  const visited: Set<string> = new Set();

  stack.push([value]);

  while (stack.length > 0) {
    const items = stack.pop();

    for (const item of items) {
      visited.add(item.id);

      if (item instanceof CustomObject) {
        if (Array.isArray(item.value)) {
          result ^= getHashCode(item.value.length);
          for (let index = item.value.length - 1; index >= 0; index--) {
            const child = item.value[index];
            if (!(child instanceof CustomObject) || !visited.has(child.id))
              stack.push([child]);
          }
        } else {
          result ^= getHashCode(item.value.length);
          const chunk: CustomValue[] = [];
          item.value.forEach((child: CustomValue, key: CustomValue) => {
            if (!(key instanceof CustomObject) || !visited.has(key.id))
              chunk.push(key);
            if (!(child instanceof CustomObject) || !visited.has(child.id))
              chunk.push(child);
          });
          stack.push(chunk);
        }
      } else {
        result ^= item.hash();
      }
    }

    result ^= rotateBits(result);
  }

  return result;
}
