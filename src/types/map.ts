import IntrinsicsContainer from '../intrinsics-container';
import Path from '../utils/path';
import Defaults from './default';
import CustomFunction from './function';
import {
  CustomObject,
  CustomValue,
  CustomValueWithIntrinsics
} from './generics';
import CustomNil from './nil';
import CustomString from './string';

import deepEqual from '../utils/deep-equal';

export const CLASS_ID_PROPERTY = new CustomString('classID');

export const getValue = (map: CustomMap, mapKey: CustomValue): CustomValue => {
  for (const [key, value] of map.value.entries()) {
    if (deepEqual(key, mapKey)) {
      return value;
    }
  }
  return Defaults.Void;
};

export const hasValue = (map: CustomMap, mapKey: CustomValue): boolean => {
  for (const key of map.value.keys()) {
    if (deepEqual(key, mapKey)) {
      return true;
    }
  }
  return false;
};

export const setValue = (
  map: CustomMap,
  mapKey: CustomValue,
  mapValue: CustomValue
): void => {
  for (const key of map.value.keys()) {
    if (deepEqual(key, mapKey)) {
      map.value.set(key, mapValue);
      return;
    }
  }
  map.value.set(mapKey, mapValue);
};

export class CustomMapIterator implements Iterator<CustomValue> {
  value: Map<CustomValue, CustomValue>;
  index: number;

  constructor(value: Map<CustomValue, CustomValue>) {
    const me = this;
    me.value = value;
    me.index = 0;
  }

  next(): IteratorResult<CustomMap> {
    const me = this;
    const keys = Array.from(me.value.keys());

    if (me.index === keys.length) {
      return {
        value: new CustomNil(),
        done: true
      };
    }

    const key = keys[me.index++];

    return {
      value: new CustomMap(
        new Map<CustomValue, CustomValue>([
          [new CustomString('key'), key],
          [new CustomString('value'), me.value.get(key)]
        ])
      ),
      done: false
    };
  }
}

export default class CustomMap extends CustomObject {
  private static intrinsics: IntrinsicsContainer = new IntrinsicsContainer();

  static getIntrinsics(): IntrinsicsContainer {
    return this.intrinsics;
  }

  static addIntrinsic(name: string, fn: CustomFunction) {
    this.intrinsics.add(name, fn);
  }

  readonly value: Map<CustomValue, CustomValue>;
  private isInstance: boolean = false;

  constructor(
    value: Map<CustomValue, CustomValue> = new Map<CustomValue, CustomValue>()
  ) {
    super();
    this.value = new Map<CustomValue, CustomValue>(value);
  }

  getCustomType(): string {
    if (hasValue(this, CLASS_ID_PROPERTY)) {
      return getValue(this, CLASS_ID_PROPERTY).toString();
    }

    return 'map';
  }

  toString(): string {
    const values = [];

    for (const [key, value] of this.value) {
      values.push(`${key}: ${value.toString()}`);
    }

    return `{ ${values.join(', ')} }`;
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

  [Symbol.iterator](): CustomMapIterator {
    return new CustomMapIterator(this.value);
  }

  extend(map: CustomMap | Map<CustomValue, CustomValue>): CustomMap {
    if (map instanceof CustomMap) {
      map = map.value;
    }

    for (const [key, value] of map) {
      setValue(this, key, value);
    }

    return this;
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (hasValue(this, current)) {
        const sub = getValue(this, current);

        if (
          traversalPath.count() > 0 &&
          sub instanceof CustomValueWithIntrinsics
        ) {
          return sub.has(traversalPath);
        }

        return traversalPath.count() === 0;
      }
    }

    return false;
  }

  set(path: Path<CustomValue> | CustomValue, newValue: CustomValue): void {
    if (path instanceof CustomValue) {
      return this.set(new Path<CustomValue>([path]), newValue);
    }

    const traversalPath = path.clone();
    const last = traversalPath.last();
    const current = traversalPath.next();

    if (current !== null) {
      if (hasValue(this, current)) {
        const sub = getValue(this, current);

        if (sub instanceof CustomValueWithIntrinsics) {
          sub.set(traversalPath, newValue);
          return;
        }
      }

      throw new Error(`Cannot set path ${path.toString()}.`);
    }

    setValue(this, last, newValue);
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (hasValue(this, current)) {
        const sub = getValue(this, current);

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      } else if (
        path.count() === 1 &&
        CustomMap.getIntrinsics().has(current.toString())
      ) {
        return CustomMap.getIntrinsics().get(current.toString());
      }
    }

    throw new Error(`Unknown path in map ${path.toString()}.`);
  }

  createInstance(): CustomMap {
    const newInstance = new CustomMap(this.value);
    newInstance.isInstance = true;
    return newInstance;
  }
}
