import CustomValue from './base';

export default class CustomBoolean extends CustomValue {
  readonly value: boolean;

  constructor(value: boolean) {
    super();
    this.value = !!value;
  }

  getCustomType(): string {
    return 'boolean';
  }

  toJSON(): string {
    return this.toNumber().toString();
  }

  toString(): string {
    return this.value.toString();
  }

  fork(): CustomBoolean {
    return new CustomBoolean(this.value);
  }

  toNumber(): number {
    return this.value ? 1.0 : 0.0;
  }

  toInt(): number {
    return this.value ? 1 : 0;
  }

  toTruthy(): boolean {
    return this.value;
  }

  instanceOf(v: CustomValue): boolean {
    return v instanceof CustomBoolean;
  }
}

export const DefaultTrue = new CustomBoolean(true);
export const DefaultFalse = new CustomBoolean(false);
