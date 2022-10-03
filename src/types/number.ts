import IntrinsicsContainer from '../intrinsics-container';
import Path from '../utils/path';
import CustomFunction from './function';
import { CustomValue, CustomValueWithIntrinsics, Void } from './generics';

export class CustomNumberIterator implements Iterator<CustomValue> {
  next(): IteratorResult<CustomValue> {
    return {
      value: null,
      done: true
    };
  }
}

export default class CustomNumber extends CustomValueWithIntrinsics {
  readonly value: number;

  private static intrinsics: IntrinsicsContainer = new IntrinsicsContainer();

  static getIntrinsics(): IntrinsicsContainer {
    return this.intrinsics;
  }

  static addIntrinsic(name: string, fn: CustomFunction) {
    this.intrinsics.add(name, fn);
  }

  constructor(value: number) {
    super();
    this.value = value;
  }

  getCustomType(): string {
    return 'number';
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

  [Symbol.iterator](): CustomNumberIterator {
    return new CustomNumberIterator();
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
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
      path.count() === 1 &&
      CustomNumber.getIntrinsics().has(current.toString())
    ) {
      return CustomNumber.intrinsics.get(current.toString());
    }

    return Void;
  }
}

export const NegativeOne = new CustomNumber(-1);
export const PositiveOne = new CustomNumber(1);
export const Zero = new CustomNumber(0);