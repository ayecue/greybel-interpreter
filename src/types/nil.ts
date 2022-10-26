import CustomValue from './base';

export default class CustomNil extends CustomValue {
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

  instanceOf(v: CustomValue): boolean {
    return v instanceof CustomNil;
  }
}

export const Void = new CustomNil();
