import Path from '../utils/path';
import Defaults from './default';
import CustomFunction from './function';
import { CustomObject, CustomValue } from './generics';

export class CustomInterfaceIterator implements Iterator<CustomValue> {
  next(): IteratorResult<CustomValue> {
    return {
      value: Defaults.Void,
      done: true
    };
  }
}

export default class CustomInterface extends CustomObject {
  private readonly interfaceFns: Map<string, CustomFunction>;
  private readonly type: string;

  constructor(type: string) {
    super();
    this.type = type;
    this.interfaceFns = new Map<string, CustomFunction>();
  }

  getCustomType(): string {
    return this.type;
  }

  toString(): string {
    return this.type;
  }

  fork(): CustomInterface {
    return this;
  }

  toNumber(): number {
    return Number.NaN;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return true;
  }

  [Symbol.iterator](): CustomInterfaceIterator {
    return new CustomInterfaceIterator();
  }

  has(path: Path<string> | string): boolean {
    if (typeof path === 'string') {
      return this.has(new Path<string>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      return this.interfaceFns.has(current);
    }

    return false;
  }

  set(_path: Path<string> | string, _newValue: CustomValue) {
    throw new Error('Cannot set property on an interface.');
  }

  get(path: Path<string> | string): CustomValue {
    if (typeof path === 'string') {
      return this.get(new Path<string>([path]));
    }

    if (path.count() === 0) {
      return this;
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.interfaceFns.has(current)) {
        return this.interfaceFns.get(current);
      }
    }

    throw new Error(`Unknown path in interface ${path.toString()}.`);
  }

  addFunction(name: string, fn: CustomFunction): CustomInterface {
    this.interfaceFns.set(name, fn);
    return this;
  }
}
