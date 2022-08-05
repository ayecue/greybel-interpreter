import IntrinsicsContainer from '../intrinsics-container';
import Path from '../utils/path';
import CustomFunction from './function';
import {
  CustomObject,
  CustomValue,
  CustomValueWithIntrinsics
} from './generics';
import CustomNil from './nil';
import CustomString from './string';

export class CustomMapIterator implements Iterator<CustomValue> {
  value: Map<string, CustomValue>;
  index: number;

  constructor(value: Map<string, CustomValue>) {
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
        new Map([
          ['key', new CustomString(key)],
          ['value', me.value.get(key)]
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

  readonly value: Map<string, CustomValue>;
  private isInstance: boolean = false;

  constructor(
    value: Map<string, CustomValue> = new Map<string, CustomValue>()
  ) {
    super();
    this.value = new Map<string, CustomValue>(value);
  }

  getCustomType(): string {
    if (this.has('classID')) {
      return this.get('classID').toString();
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

  extend(map: CustomMap | Map<string, CustomValue>): CustomMap {
    if (map instanceof CustomMap) {
      map = map.value;
    }

    for (const [key, value] of map) {
      this.value.set(key, value);
    }

    return this;
  }

  has(path: Path<string> | string): boolean {
    if (typeof path === 'string') {
      return this.has(new Path<string>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

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

  set(path: Path<string> | string, newValue: CustomValue): void {
    if (typeof path === 'string') {
      return this.set(new Path<string>([path]), newValue);
    }

    const traversalPath = path.clone();
    const last = traversalPath.last();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (sub instanceof CustomValueWithIntrinsics) {
          sub.set(traversalPath, newValue);
          return;
        }
      }

      throw new Error(`Cannot set path ${path.toString()}.`);
    }

    this.value.set(last, newValue);
  }

  get(path: Path<string> | string): CustomValue {
    if (typeof path === 'string') {
      return this.get(new Path<string>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      } else if (path.count() === 1 && CustomMap.getIntrinsics().has(current)) {
        return CustomMap.getIntrinsics().get(current);
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
