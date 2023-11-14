import { ContextTypeIntrinsics } from '../context/types';
import { uuid } from '../utils/uuid';

export abstract class CustomValue {
  readonly id: string;

  constructor() {
    this.id = uuid();
  }

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
