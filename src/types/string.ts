import { ContextTypeIntrinsics } from '../context/types';
import { getStringHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { CustomValue } from './base';
import { CustomNumber } from './number';
import {
  CustomValueWithIntrinsics,
  CustomValueWithIntrinsicsResult
} from './with-intrinsics';

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

    if (me.index >= me.value.length) {
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

export class CustomString extends CustomValueWithIntrinsics {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  static getCharIndex(item: CustomString, index: number): number {
    let n = index | 0;
    if (n < 0) n += item.value.length;
    if (n < 0 || n >= item.value.length) return -1;
    return n;
  }

  readonly id: string;
  readonly value: string;

  constructor(value: string) {
    super();
    this.id = `s:${value}`;
    this.value = value;
  }

  getCustomType(): string {
    return 'string';
  }

  toJSON(): string {
    return `"${this.value}"`;
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

  instanceOf(v: CustomValue, typeIntrinsics: ContextTypeIntrinsics): boolean {
    return v.value === (typeIntrinsics.string ?? CustomString.intrinsics);
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

  has(current: CustomValue): boolean {
    if (current instanceof CustomNumber) {
      const index = current.toInt();
      return !!this.value[index];
    }

    return false;
  }

  set(_path: CustomValue, _newValue: CustomValue) {
    throw new Error('Mutable operations are not allowed on a string.');
  }

  get(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue {
    if (current instanceof CustomNumber) {
      const currentIndex = this.getCharIndex(current.toInt());
      const segment = this.value[currentIndex];

      if (segment) {
        return new CustomString(segment);
      }

      throw new Error(
        `Index error (string index ${currentIndex} out of range).`
      );
    }

    const intrinsics = typeIntrinsics.string ?? CustomString.getIntrinsics();

    if (intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(`Unknown path in string ${current.toString()}.`);
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

  hash() {
    return getStringHashCode(this.value);
  }
}
