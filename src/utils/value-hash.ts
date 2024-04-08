import { CustomValue } from '../types/base';
import { deepHash } from './deep-hash';

export function valueHash(value: CustomValue): number {
  const valueType = typeof value.value;

  switch (valueType) {
    case 'string':
    case 'number':
    case 'boolean':
      return value.hash();
  }

  return deepHash(value);
}
