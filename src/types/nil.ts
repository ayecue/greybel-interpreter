import { CustomValue } from './base';

export class CustomNil extends CustomValue {
  value: null = null;

  getCustomType(): string {
    return 'null';
  }

  toJSON(): string {
    return this.toString();
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

  instanceOf(v: CustomValue): boolean {
    return v instanceof CustomNil;
  }

  hash() {
    return -1;
  }
}

export const Void = new CustomNil();
