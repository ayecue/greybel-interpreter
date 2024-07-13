import { ContextTypeIntrinsics } from '../context/types';
import { getHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { CustomValue } from './base';
import {
  CustomValueWithIntrinsics,
  CustomValueWithIntrinsicsResult
} from './with-intrinsics';

export class CustomNumberIterator implements Iterator<CustomValue> {
  index: number = 0;

  next(): IteratorResult<CustomValue> {
    return {
      value: null,
      done: true
    };
  }
}

export class CustomNumber extends CustomValueWithIntrinsics {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  readonly id: string;
  readonly value: number;

  constructor(value: number) {
    super();
    this.id = `n:${value.toString()}`;
    this.value = value;
  }

  getCustomType(): string {
    return 'number';
  }

  toJSON(): string {
    return this.value.toString();
  }

  toString(): string {
    return this.value.toString();
  }

  fork(): CustomNumber {
    return new CustomNumber(this.value);
  }

  toInt(): number {
    return this.value | 0;
  }

  toNumber(): number {
    return this.value;
  }

  toTruthy(): boolean {
    return !!this.value;
  }

  instanceOf(v: CustomValue, typeIntrinsics: ContextTypeIntrinsics): boolean {
    return v.value === (typeIntrinsics.number ?? CustomNumber.intrinsics);
  }

  [Symbol.iterator](): CustomNumberIterator {
    return new CustomNumberIterator();
  }

  has(_path: CustomValue): boolean {
    return false;
  }

  set(_path: CustomValue, _newValue: CustomValue) {
    throw new Error('Mutable operations are not allowed on a number.');
  }

  get(
    current: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue {
    const intrinsics = typeIntrinsics.number ?? CustomNumber.getIntrinsics();

    if (intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(
      `Path "${current.toString()}" not found in number intrinsics.`
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

  hash() {
    return getHashCode(this.value);
  }
}

export const NegativeOne = new CustomNumber(-1);
export const PositiveOne = new CustomNumber(1);
export const Zero = new CustomNumber(0);
