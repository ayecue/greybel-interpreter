import { ContextTypeIntrinsics } from '../context/types';
import { getHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { Path } from '../utils/path';
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
  readonly value: number;

  constructor(value: number) {
    super();
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

  has(_path: Path<CustomValue> | CustomValue): boolean {
    return false;
  }

  set(_path: Path<CustomValue> | CustomValue, _newValue: CustomValue) {
    throw new Error('Mutable operations are not allowed on a number.');
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
    const intrinsics = typeIntrinsics.number ?? CustomNumber.getIntrinsics();

    if (traversalPath.count() === 0 && intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(`Unknown path in number ${path.toString()}.`);
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

  hash() {
    return getHashCode(this.value);
  }
}

export const NegativeOne = new CustomNumber(-1);
export const PositiveOne = new CustomNumber(1);
export const Zero = new CustomNumber(0);
