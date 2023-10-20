import { CustomValue } from '../types/base';
import { Void } from '../types/nil';

export type ObjectValueKeyPair = [CustomValue, CustomValue];

export class ObjectValue {
  private data: Map<number, ObjectValueKeyPair>;

  constructor(entries?: ObjectValue | ObjectValueKeyPair[] | null) {
    if (entries == null) {
      this.data = new Map();
    } else if (entries instanceof ObjectValue) {
      this.data = new Map(entries.data)
    } else if (Array.isArray(entries)) {
      this.data = new Map();

      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }

    if (this.data == null) {
      throw new Error('Unknown entries type.');
    }
  }

  get(mapKey: CustomValue): CustomValue {
    const hash = mapKey.hash();
    if (!this.data.has(hash)) return Void;
    return this.data.get(hash)[1];
  }

  has(mapKey: CustomValue): boolean {
    const hash = mapKey.hash();
    return this.data.has(hash);
  }

  set(mapKey: CustomValue, mapValue: CustomValue): this {
    const hash = mapKey.hash();
    this.data.set(hash, [mapKey, mapValue]);
    return this;
  }

  delete(mapKey: CustomValue) {
    const hash = mapKey.hash();
    return this.data.delete(hash);
  }

  values(): CustomValue[] {
    return [...this.data.values()].map(([_, v]) => v);
  }

  keys(): CustomValue[] {
    return [...this.data.values()].map(([k]) => k);
  }

  entries(): ObjectValueKeyPair[] {
    return [...this.data.values()];
  }

  get size(): number {
    return this.data.size;
  }

  forEach(callback: (value: CustomValue, key: CustomValue, map: ObjectValue) => any): void {
    for (const [key, value] of this.data.values()) {
      callback(value, key, this);
    } 
  }

  extend(objVal: ObjectValue): this {
    for (const [key, value] of objVal.entries()) {
      this.set(key, value);
    }
    return this;
  }
}
