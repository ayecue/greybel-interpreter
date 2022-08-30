import { CustomValue } from './generics';

export default class CustomNil extends CustomValue {
  value: null = null;

  getCustomType(): string {
    return 'null';
  }

  toString(): string {
    return '';
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
