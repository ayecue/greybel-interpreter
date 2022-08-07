import CustomBoolean from './boolean';
import CustomNil from './nil';
import CustomNumber from './number';

export default class Defaults {
  static readonly Void = new CustomNil();
  static readonly True = new CustomBoolean(true);
  static readonly False = new CustomBoolean(false);
  static readonly NegativeOne = new CustomNumber(-1);
  static readonly PositiveOne = new CustomNumber(1);
  static readonly Zero = new CustomNumber(0);
}
