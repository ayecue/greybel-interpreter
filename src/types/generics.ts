import Path from '../utils/path';
import deepEqual from '../utils/deep-equal';

export abstract class CustomValue {
  abstract value: any;
  abstract getCustomType(): string;
  abstract toNumber(): number;
  abstract toInt(): number;
  abstract toString(): string;
  abstract toTruthy(): boolean;
  abstract fork(): CustomValue;
}

export abstract class CustomValueWithIntrinsics extends CustomValue {
  abstract has(path: Path<CustomValue> | CustomValue): boolean;
  abstract set(path: Path<CustomValue> | CustomValue, value: CustomValue): void;
  abstract get(path: Path<CustomValue> | CustomValue): CustomValue;
  abstract [Symbol.iterator](): Iterator<CustomValue>;
}

export abstract class CustomObject extends CustomValueWithIntrinsics {}

export class CustomNil extends CustomValue {
  value: null = null;

  getCustomType(): string {
    return 'null';
  }

  toString(): string {
    return 'null';
  }

  fork(): CustomNil {
    return new CustomNil();
  }

  toNumber(): number {
    return undefined;
  }

  toInt(): number {
    return undefined;
  }

  toTruthy(): boolean {
    return false;
  }
}

export const Void = new CustomNil();

export class ObjectValue extends Map<CustomValue, CustomValue> {
  get(
    mapKey: CustomValue
  ): CustomValue {
    for (const [key, value] of this.entries()) {
      if (deepEqual(key, mapKey)) {
        return value;
      }
    }
    return Void;
  }

  has(
    mapKey: CustomValue
  ): boolean {
    for (const key of this.keys()) {
      if (deepEqual(key, mapKey)) {
        return true;
      }
    }
    return false;
  }

  set(
    mapKey: CustomValue,
    mapValue: CustomValue
  ): this {
    for (const key of this.keys()) {
      if (deepEqual(key, mapKey)) {
        super.set(key, mapValue);
        return;
      }
    }
    super.set(mapKey, mapValue);
    return this;
  }
}
