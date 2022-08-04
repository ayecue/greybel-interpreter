import { CustomValue } from './generics';

export default class CustomNumber extends CustomValue {
  readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  getCustomType(): string {
    return 'number';
  }

  toString(): string {
    return this.value.toString();
  }

  fork(): CustomNumber {
    return new CustomNumber(this.value);
  }

  toInt(): number {
    return this.value | 0;
  }

  toNumber(): number {
    return this.value;
  }

  toTruthy(): boolean {
    return !!this.value;
  }
}
