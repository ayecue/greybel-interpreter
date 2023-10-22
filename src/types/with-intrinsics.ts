import { ObjectValue } from '../utils/object-value';
import { Path } from '../utils/path';
import { CustomValue } from './base';
import { CustomFunction } from './function';

export abstract class CustomValueWithIntrinsics extends CustomValue {
  abstract has(path: Path<CustomValue> | CustomValue): boolean;
  abstract set(path: Path<CustomValue> | CustomValue, value: CustomValue): void;
  abstract get(path: Path<CustomValue> | CustomValue): CustomValue;
  abstract [Symbol.iterator](): Iterator<CustomValue> & { index: number };
  static readonly intrinsics: ObjectValue;

  static getIntrinsics(): ObjectValue {
    return this.intrinsics;
  }

  static addIntrinsic(key: CustomValue, fn: CustomFunction) {
    this.intrinsics.set(key, fn);
  }

  static clearIntrinsics() {
    this.intrinsics.clear();
  }

  getIntrinsics(): ObjectValue {
    return (this.constructor as any).intrinsics as ObjectValue;
  }
}

export abstract class CustomObject extends CustomValueWithIntrinsics {}
