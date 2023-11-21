import { ContextTypeIntrinsics } from '../context/types';
import { ObjectValue } from '../utils/object-value';
import { CustomValue } from './base';
import { CustomFunction } from './function';

export type CustomValueWithIntrinsicsResult = {
  value: CustomValue;
  /* eslint-disable no-use-before-define */
  origin: CustomValueWithIntrinsics;
};

export abstract class CustomValueWithIntrinsics extends CustomValue {
  abstract has(path: CustomValue): boolean;
  abstract set(path: CustomValue, value: CustomValue): void;
  abstract get(
    path: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValue;

  abstract getWithOrigin(
    path: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): CustomValueWithIntrinsicsResult;

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

export abstract class CustomObject extends CustomValueWithIntrinsics {
  abstract getSize(): number;
}
