import { DefaultFalse, DefaultTrue } from './boolean';
import { Void } from './nil';
import { NegativeOne, PositiveOne, Zero } from './number';

export default class Defaults {
  static readonly Void = Void;
  static readonly True = DefaultTrue;
  static readonly False = DefaultFalse;
  static readonly NegativeOne = NegativeOne;
  static readonly PositiveOne = PositiveOne;
  static readonly Zero = Zero;
}
