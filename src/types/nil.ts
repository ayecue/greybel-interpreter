import { CustomValue } from './generics';

export default class CustomNil extends CustomValue {
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
    return Number.NaN;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return false;
  }
}
