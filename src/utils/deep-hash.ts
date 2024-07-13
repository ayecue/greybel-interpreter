import { CustomValue } from '../types/base';
import { CustomObject } from '../types/with-intrinsics';
import { getHashCode, rotateBits } from './hash';
import { ObjectValueKeyPair } from './object-value';

export function deepHash(value: CustomValue): number {
  let result = 0;
  const stack: CustomValue[][] = [];
  const visited: Set<string> = new Set();

  stack.push([value]);

  while (stack.length > 0) {
    const items = stack.pop();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      visited.add(item.id);

      if (item instanceof CustomObject) {
        if (Array.isArray(item.value)) {
          result ^= getHashCode(item.value.length);
          for (let j = item.value.length - 1; j >= 0; j--) {
            const child = item.value[j];
            if (!(child instanceof CustomObject) || !visited.has(child.id))
              stack.push([child]);
          }
        } else {
          result ^= getHashCode(item.value.length);
          const chunk: CustomValue[] = [];
          const entries = item.value.entries() as ObjectValueKeyPair[];
          for (let j = 0; j < entries.length; j++) {
            const [key, child] = entries[j];
            if (!(key instanceof CustomObject) || !visited.has(key.id))
              chunk.push(key);
            if (!(child instanceof CustomObject) || !visited.has(child.id))
              chunk.push(child);
          }
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
