import { ContextTypeIntrinsics } from '../context/types';
import { getHashCode, rotateBits } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { Path } from '../utils/path';
import { CustomValue } from './base';
import { CustomNumber } from './number';
import {
  CustomObject,
  CustomValueWithIntrinsics,
  CustomValueWithIntrinsicsResult
} from './with-intrinsics';

export class CustomListIterator implements Iterator<CustomValue> {
  value: Array<CustomValue>;
  index: number;

  constructor(value: Array<CustomValue>) {
    const me = this;
    me.value = value;
    me.index = 0;
  }

  next(): IteratorResult<CustomValue> {
    const me = this;

    if (me.index >= me.value.length) {
      return {
        value: null,
        done: true
      };
    }

    return {
      value: me.value[me.index++],
      done: false
    };
  }
}

export class CustomList extends CustomObject {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  static getItemIndex(item: CustomList, index: number): number {
    let n = index | 0;
    if (n < 0) n += item.value.length;
    if (n < 0 || n >= item.value.length) return -1;
    return n;
  }

  readonly value: Array<CustomValue>;

  constructor(value: Array<CustomValue> = []) {
    super();
    this.value = [...value];
  }

  getCustomType(): string {
    return 'list';
  }

  toJSON(depth: number = 0): string {
    return this.toString(depth);
  }

  toString(depth: number = 0): string {
    return `[${this.value.map((item) => item.toJSON(depth)).join(', ')}]`;
  }

  fork(): CustomList {
    return new CustomList(this.value);
  }

  toNumber(): number {
    return 0;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return this.value.length > 0;
  }

  instanceOf(v: CustomValue, typeIntrinsics: ContextTypeIntrinsics): boolean {
    return v.value === (typeIntrinsics.list ?? CustomList.intrinsics);
  }

  slice(a: CustomValue, b: CustomValue): CustomList {
    return new CustomList(this.value.slice(a.toNumber(), b.toNumber()));
  }

  extend(list: CustomList | Array<CustomValue>): CustomList {
    if (list instanceof CustomList) {
      list = list.value;
    }

    for (let index = 0; index < list.length; index++) {
      this.value.push(list[index]);
    }

    return this;
  }

  [Symbol.iterator](): CustomListIterator {
    return new CustomListIterator(this.value);
  }

  getItemIndex(index: number): number {
    return CustomList.getItemIndex(this, index);
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current instanceof CustomNumber) {
      const currentIndex = this.getItemIndex(current.toInt());
      const sub = this.value[currentIndex];

      if (sub) {
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

    if (current instanceof CustomNumber) {
      const currentIndex = this.getItemIndex(current.toInt());
      const sub = this.value[currentIndex];

      if (sub) {
        if (
          traversalPath.count() > 0 &&
          sub instanceof CustomValueWithIntrinsics
        ) {
          sub.set(traversalPath, newValue);
          return;
        }
      }

      throw new Error(`Cannot set path ${path.toString()}.`);
    }

    if (last instanceof CustomNumber) {
      const lastIndex = this.getItemIndex(last.toInt());

      if (lastIndex >= 0 && lastIndex < this.value.length) {
        this.value[lastIndex] = newValue;
        return;
      }

      throw new Error(`Index error (list index ${lastIndex} out of range).`);
    }

    throw new Error(`Index is not a number.`);
  }

  get(
    path: Path<CustomValue> | CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]), typeIntrinsics);
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current instanceof CustomNumber) {
      const currentIndex = this.getItemIndex(current.toInt());

      if (currentIndex >= 0 && currentIndex < this.value.length) {
        const sub = this.value[currentIndex];

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath, typeIntrinsics);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      }

      throw new Error(`Index error (list index ${currentIndex} out of range).`);
    }

    const intrinsics = typeIntrinsics.list ?? CustomList.getIntrinsics();

    if (path.count() === 1 && intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(`Unknown path in list ${path.toString()}.`);
  }

  getWithOrigin(
    path: Path<CustomValue> | CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValueWithIntrinsicsResult {
    return {
      value: this.get(path, typeIntrinsics),
      origin: null
    };
  }

  hash(recursionDepth = 0): number {
    let result = getHashCode(this.value.length);
    if (recursionDepth > 16) return result;
    this.value.forEach((value: CustomValue) => {
      result = rotateBits(result) ^ value.hash(recursionDepth + 1);
    });
    return result;
  }
}
