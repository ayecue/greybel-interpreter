import { ObjectValue } from '../utils/object-value';
import { Path } from '../utils/path';
import { CustomValue } from './base';
import { CustomValueWithIntrinsics } from './with-intrinsics';

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

  instanceOf(v: CustomValue): boolean {
    return v.value === CustomNumber.intrinsics;
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

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (
      traversalPath.count() === 0 &&
      CustomNumber.getIntrinsics().has(current)
    ) {
      return CustomNumber.intrinsics.get(current);
    }

    throw new Error(`Unknown path in number ${path.toString()}.`);
  }
}

export const NegativeOne = new CustomNumber(-1);
export const PositiveOne = new CustomNumber(1);
export const Zero = new CustomNumber(0);
