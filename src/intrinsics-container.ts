import CustomFunction from './types/function';

export default class IntrinsicsContainer {
  private readonly intrinsics: Map<string, CustomFunction> = new Map();

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
