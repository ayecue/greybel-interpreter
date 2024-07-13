import { ContextTypeIntrinsics } from '../context/types';
import { getHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { uuid } from '../utils/uuid';
import { CustomValue } from './base';
import { Void } from './nil';
import { CustomString, Isa } from './string';
import {
  CustomObject,
  CustomValueWithIntrinsicsResult
} from './with-intrinsics';

export const CUSTOM_MAP_MAX_DEPTH = 2;
export const CUSTOM_MAP_MAX_DEPTH_VALUE = '{...}';

export class CustomMapIterator implements Iterator<CustomValue> {
  value: ObjectValue;
  index: number;

  constructor(value: ObjectValue) {
    const me = this;
    me.value = value;
    me.index = 0;
  }

  next(): IteratorResult<CustomMap> {
    const me = this;
    const keys = Array.from(me.value.keys());

    if (me.index >= keys.length) {
      return {
        value: Void,
        done: true
      };
    }

    const key = keys[me.index++];

    return {
      value: new CustomMap(
        new ObjectValue([
          [new CustomString('key'), key],
          [new CustomString('value'), me.value.get(key)]
        ])
      ),
      done: false
    };
  }
}

export class CustomMap extends CustomObject {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  readonly id;
  value: ObjectValue;
  isInstance: boolean = false;

  static createWithInitialValue(value: ObjectValue): CustomMap {
    const map = new CustomMap();
    map.value = value;
    return map;
  }

  constructor(value?: ObjectValue) {
    super();
    this.id = uuid();
    this.value = new ObjectValue(value);
  }

  getCustomType(): string {
    return 'map';
  }

  toJSON(depth: number = 0): string {
    return this.toString(depth);
  }

  toString(depth: number = 0): string {
    const fields: string[] = [];

    if (CUSTOM_MAP_MAX_DEPTH < depth) {
      return CUSTOM_MAP_MAX_DEPTH_VALUE;
    }

    const entries = this.value.entries();

    for (let index = 0; index < entries.length; index++) {
      const [key, value] = entries[index];
      fields.push(
        `${
          key instanceof CustomMap ? key.toJSON(depth + 1) : key.toJSON(depth)
        }:${
          value instanceof CustomMap
            ? value.toJSON(depth + 1)
            : value.toJSON(depth)
        }`
      );
    }

    return `{${fields.join(',')}}`;
  }

  fork(): CustomMap {
    return new CustomMap(this.value);
  }

  toNumber(): number {
    return 0;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return this.value.size > 0;
  }

  getSize(): number {
    return this.value.size;
  }

  instanceOf(v: CustomValue, typeIntrinsics: ContextTypeIntrinsics): boolean {
    if (v instanceof CustomMap) {
      let current: CustomMap | null = this;

      while ((current = current.getIsa())) {
        if (current === v) {
          return true;
        }
      }

      return v.value === (typeIntrinsics.map ?? CustomMap.getIntrinsics());
    }

    return false;
  }

  [Symbol.iterator](): CustomMapIterator {
    return new CustomMapIterator(this.value);
  }

  extend(map: CustomMap | ObjectValue): CustomMap {
    if (map instanceof CustomMap) {
      map = map.value;
    }
    this.value.extend(map);
    return this;
  }

  has(current: CustomValue): boolean {
    if (current !== null) {
      if (this.value.has(current)) {
        return true;
      }

      const isa = this.getIsa();

      return isa ? isa.has(current) : false;
    }

    return false;
  }

  set(current: CustomValue, newValue: CustomValue): void {
    this.value.set(current, newValue);
  }

  get(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue {
    if (current !== null) {
      const item = this.value.get(current);
      if (item) return item;

      const isa = this.getIsa();

      if (isa?.has(current)) {
        return isa.get(current, typeIntrinsics);
      }

      const intrinsics = typeIntrinsics.map ?? CustomMap.getIntrinsics();

      if (intrinsics.has(current)) {
        return intrinsics.get(current);
      }
    }

    throw new Error(`Path "${current.toString()}" not found in map.`);
  }

  getWithOrigin(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValueWithIntrinsicsResult {
    if (current !== null) {
      const item = this.value.get(current);
      if (item) {
        return {
          value: item,
          origin: this
        };
      }

      const isa = this.getIsa();

      if (isa?.has(current)) {
        return isa.getWithOrigin(current, typeIntrinsics);
      }

      const intrinsics = typeIntrinsics.map ?? CustomMap.getIntrinsics();

      if (intrinsics.has(current)) {
        return {
          value: intrinsics.get(current),
          origin: null
        };
      }
    }

    throw new Error(`Path "${current.toString()}" not found in map.`);
  }

  createInstance(): CustomMap {
    const newInstance = new CustomMap(new ObjectValue());
    newInstance.value.set(Isa, this);
    newInstance.isInstance = true;
    return newInstance;
  }

  getIsa(): CustomMap | null {
    const isa = this.value.get(Isa);
    return isa instanceof CustomMap ? isa : null;
  }

  hash(recursionDepth = 0): number {
    let result = getHashCode(this.value.size);
    if (recursionDepth > 4) return result;
    this.value.forEach((value: CustomValue, key: CustomValue) => {
      result ^= key.hash(recursionDepth + 1);
      result ^= value.hash(recursionDepth + 1);
    });
    return result;
  }
}
