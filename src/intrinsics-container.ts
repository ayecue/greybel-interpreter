import CustomFunction from './types/function';
import { ObjectValue } from './types/generics';

export default class IntrinsicsContainer {
  private readonly intrinsics: ObjectValue = new ObjectValue();

  add(name: string, fn: CustomFunction): IntrinsicsContainer {
    this.intrinsics.set(name, fn);
    return this;
  }

  has(name: string): boolean {
    return this.intrinsics.has(name);
  }

  get(name: string): CustomFunction {
    return this.intrinsics.get(name) || null;
  }
}
