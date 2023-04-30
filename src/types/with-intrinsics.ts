import { ObjectValue } from '../utils/object-value';
import { Path } from '../utils/path';
import { CustomValue } from './base';
import { CustomFunction } from './function';

export abstract class CustomValueWithIntrinsics extends CustomValue {
  abstract has(path: Path<CustomValue> | CustomValue): boolean;
  abstract set(path: Path<CustomValue> | CustomValue, value: CustomValue): void;
  abstract get(path: Path<CustomValue> | CustomValue): CustomValue;
  abstract [Symbol.iterator](): Iterator<CustomValue>;
  static readonly intrinsics: ObjectValue;

  static getIntrinsics(): ObjectValue {
    return this.intrinsics;
  }

  static addIntrinsic(key: CustomValue, fn: CustomFunction) {
    this.intrinsics.set(key, fn);
  }
}

export abstract class CustomObject extends CustomValueWithIntrinsics {}
