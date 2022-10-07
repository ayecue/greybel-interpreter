export default abstract class CustomValue {
  abstract value: any;
  abstract getCustomType(): string;
  abstract toNumber(): number;
  abstract toInt(): number;
  abstract toString(): string;
  abstract toTruthy(): boolean;
  abstract fork(): CustomValue;
}
