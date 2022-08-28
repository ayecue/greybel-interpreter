import Path from '../utils/path';
import Defaults from './default';
import CustomFunction from './function';
import { CustomObject, CustomValue } from './generics';
import CustomString from './string';

export class CustomInterfaceIterator implements Iterator<CustomValue> {
  next(): IteratorResult<CustomValue> {
    return {
      value: Defaults.Void,
      done: true
    };
  }
}

export default class CustomInterface extends CustomObject {
  private readonly interfaceFns: Map<CustomValue, CustomFunction>;
  private readonly type: string;
  readonly value: Object = {};

  constructor(type: string) {
    super();
    this.type = type;
    this.interfaceFns = new Map<CustomValue, CustomFunction>();
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

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      return this.interfaceFns.has(current);
    }

    return false;
  }

  set(_path: Path<CustomValue> | CustomValue, _newValue: CustomValue) {
    throw new Error('Cannot set property on an interface.');
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
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
    this.interfaceFns.set(new CustomString(name), fn);
    return this;
  }
}
