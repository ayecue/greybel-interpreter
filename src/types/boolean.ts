import { CustomNumber } from './number';

export class CustomBoolean extends CustomNumber {
  constructor(value: boolean | number) {
    super(+value);
  }

  getCustomType(): string {
    return 'number';
  }

  toJSON(): string {
    return this.toNumber().toString();
  }

  toString(): string {
    return this.value.toString();
  }

  fork(): CustomBoolean {
    return new CustomBoolean(!!this.value);
  }

  toNumber(): number {
    return this.value ? 1.0 : 0.0;
  }

  toInt(): number {
    return this.value ? 1 : 0;
  }

  toTruthy(): boolean {
    return !!this.value;
  }
}

export const DefaultTrue = new CustomBoolean(true);
export const DefaultFalse = new CustomBoolean(false);
