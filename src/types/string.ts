import ObjectValue from '../utils/object-value';
import Path from '../utils/path';
import CustomValue from './base';
import Defaults from './default';
import CustomNumber from './number';
import { CustomValueWithIntrinsics } from './with-intrinsics';

export class CustomStringIterator implements Iterator<CustomValue> {
  value: string;
  index: number;

  constructor(value: string) {
    const me = this;
    me.value = value;
    me.index = 0;
  }

  next(): IteratorResult<CustomValue> {
    const me = this;

    if (me.index === me.value.length) {
      return {
        value: null,
        done: true
      };
    }

    return {
      value: new CustomString(me.value[me.index++]),
      done: false
    };
  }
}

export default class CustomString extends CustomValueWithIntrinsics {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  static getCharIndex(item: CustomString, index: number): number {
    let n = index | 0;
    if (n < 0) n += item.value.length;
    if (n < 0 || n >= item.value.length) return -1;
    return n;
  }

  readonly value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  getCustomType(): string {
    return 'string';
  }

  toString(): string {
    return this.value;
  }

  fork(): CustomString {
    return new CustomString(this.value);
  }

  isNumber(): boolean {
    const nr = Number(this.value);
    return !Number.isNaN(nr);
  }

  parseFloat(): number {
    return parseFloat(this.value);
  }

  parseInt(): number {
    return parseInt(this.value);
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

  instanceOf(v: CustomValue): boolean {
    return v.value === CustomString.intrinsics;
  }

  slice(a: CustomValue, b: CustomValue): CustomString {
    return new CustomString(this.value.slice(a.toNumber(), b.toNumber()));
  }

  [Symbol.iterator](): CustomStringIterator {
    return new CustomStringIterator(this.value);
  }

  getCharIndex(index: number): number {
    return CustomString.getCharIndex(this, index);
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current instanceof CustomNumber) {
      const index = current.toInt();
      return !!this.value[index];
    }

    return false;
  }

  set(_path: Path<CustomValue> | CustomValue, _newValue: CustomValue) {
    throw new Error('Mutable operations are not allowed on a string.');
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current instanceof CustomNumber) {
      const currentIndex = this.getCharIndex(current.toInt());
      const segment = this.value[currentIndex];

      if (segment) {
        return new CustomString(segment);
      }

      throw new Error(
        `Index error (string index ${currentIndex} out of range).`
      );
    } else if (
      path.count() === 1 &&
      CustomString.getIntrinsics().has(current)
    ) {
      return CustomString.intrinsics.get(current);
    }

    return Defaults.Void;
  }
}
