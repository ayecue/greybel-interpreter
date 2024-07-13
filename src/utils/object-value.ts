import { CustomValue } from '../types/base';
import { valueHash } from './value-hash';

export type ObjectValueKeyPair = [CustomValue, CustomValue];

export class ObjectValue {
  private data: Map<number, ObjectValueKeyPair>;

  constructor(entries?: ObjectValue | ObjectValueKeyPair[] | null) {
    if (entries == null) {
      this.data = new Map();
    } else if (entries instanceof ObjectValue) {
      this.data = new Map(entries.data);
    } else if (Array.isArray(entries)) {
      this.data = new Map();

      for (let index = 0; index < entries.length; index++) {
        ObjectValue.prototype.set.apply(this, entries[index]);
      }
    }

    if (this.data == null) {
      throw new Error('Unknown entries type.');
    }
  }

  get(mapKey: CustomValue): CustomValue | null {
    const hash = valueHash(mapKey);
    const keyPair = this.data.get(hash);
    if (!keyPair) return null;
    return keyPair[1];
  }

  has(mapKey: CustomValue): boolean {
    const hash = valueHash(mapKey);
    return this.data.has(hash);
  }

  set(mapKey: CustomValue, mapValue: CustomValue): this {
    const hash = valueHash(mapKey);
    this.data.set(hash, [mapKey, mapValue]);
    return this;
  }

  delete(mapKey: CustomValue) {
    const hash = valueHash(mapKey);
    return this.data.delete(hash);
  }

  values(): CustomValue[] {
    return Array.from(this.data.values()).map(([_, v]) => v);
  }

  keys(): CustomValue[] {
    return Array.from(this.data.values()).map(([k]) => k);
  }

  entries(): ObjectValueKeyPair[] {
    return Array.from(this.data.values());
  }

  get size(): number {
    return this.data.size;
  }

  forEach(
    callback: (value: CustomValue, key: CustomValue, map: ObjectValue) => any
  ): void {
    const values = Array.from(this.data.values());
    for (let index = 0; index < values.length; index++) {
      callback(...values[index], this);
    }
  }

  fork() {
    const newObject = new ObjectValue();
    const values = Array.from(this.data.values());

    for (let index = 0; index < values.length; index++) {
      const [key, value] = values[index];
      newObject.set(key.fork(), value.fork());
    }

    return newObject;
  }

  extend(objVal: ObjectValue): this {
    const entries = Array.from(objVal.data);
    for (let index = 0; index < entries.length; index++) {
      Map.prototype.set.apply(this.data, entries[index]);
    }
    return this;
  }

  clear() {
    this.data.clear();
  }
}
