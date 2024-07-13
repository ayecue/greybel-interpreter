import { ContextTypeIntrinsics } from '../context/types';
import { getHashCode, rotateBits } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { uuid } from '../utils/uuid';
import { CustomValue } from './base';
import { CustomNumber } from './number';
import {
  CustomObject,
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

  readonly id: string;
  readonly value: Array<CustomValue>;

  constructor(value: Array<CustomValue> = []) {
    super();
    this.id = uuid();
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

  getSize(): number {
    return this.value.length;
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

  has(current: CustomValue): boolean {
    if (current instanceof CustomNumber) {
      const currentIndex = this.getItemIndex(current.toInt());
      const sub = this.value[currentIndex];

      if (sub) {
        return true;
      }
    }

    return false;
  }

  set(current: CustomValue, newValue: CustomValue): void {
    if (current instanceof CustomNumber) {
      const lastIndex = this.getItemIndex(current.toInt());

      if (lastIndex >= 0 && lastIndex < this.value.length) {
        this.value[lastIndex] = newValue;
        return;
      }

      throw new Error(`Index error (list index ${lastIndex} out of range).`);
    }

    throw new Error(`Index is not a number.`);
  }

  get(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue {
    if (current instanceof CustomNumber) {
      const currentIndex = this.getItemIndex(current.toInt());

      if (currentIndex >= 0 && currentIndex < this.value.length) {
        return this.value[currentIndex];
      }

      throw new Error(`Index error (list index ${currentIndex} out of range).`);
    }

    const intrinsics = typeIntrinsics.list ?? CustomList.getIntrinsics();

    if (intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(
      `Path "${current.toString()}" not found in list intrinsics.`
    );
  }

  getWithOrigin(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValueWithIntrinsicsResult {
    return {
      value: this.get(current, typeIntrinsics),
      origin: null
    };
  }

  hash(recursionDepth = 0): number {
    let result = getHashCode(this.value.length);
    if (recursionDepth > 4) return result;
    this.value.forEach((value: CustomValue) => {
      result = rotateBits(result) ^ value.hash(recursionDepth + 1);
    });
    return result;
  }
}
