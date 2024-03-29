import { ContextTypeIntrinsics } from '../context/types';

export abstract class CustomValue {
  abstract readonly id: string;
  abstract value: any;
  abstract getCustomType(): string;
  abstract toNumber(): number;
  abstract toInt(): number;
  abstract toJSON(depth?: number): string;
  abstract toString(): string;
  abstract toTruthy(): boolean;
  abstract fork(): CustomValue;
  abstract instanceOf(
    value: CustomValue,
    typeIntrinsics: ContextTypeIntrinsics
  ): boolean;

  abstract hash(recursionDepth?: number): number;
}
