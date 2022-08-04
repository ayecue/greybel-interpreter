import Path from '../utils/path';

export abstract class CustomValue {
  abstract getCustomType(): string;
  abstract toNumber(): number;
  abstract toInt(): number;
  abstract toString(): string;
  abstract toTruthy(): boolean;
  abstract fork(): CustomValue;
}

export abstract class CustomValueWithIntrinsics extends CustomValue {
  abstract has(path: Path<string> | string): boolean;
  abstract set(path: Path<string> | string, value: CustomValue): void;
  abstract get(path: Path<string> | string): CustomValue;
  abstract [Symbol.iterator](): Iterator<CustomValue>;
}

export abstract class CustomObject extends CustomValueWithIntrinsics {}
