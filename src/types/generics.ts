import Path from '../utils/path';

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
