import { Path } from '../utils/path';
import { CustomValue } from './base';
import { DefaultType } from './default';
import { CustomFunction } from './function';
import { CustomObject } from './with-intrinsics';

export class CustomInterfaceIterator implements Iterator<CustomValue> {
  next(): IteratorResult<CustomValue> {
    return {
      value: DefaultType.Void,
      done: true
    };
  }
}

export class CustomInterface extends CustomObject {
  private readonly interfaceFns: Map<string, CustomFunction>;
  private readonly type: string;
  readonly value: Object = {};

  constructor(type: string) {
    super();
    this.type = type;
    this.interfaceFns = new Map<string, CustomFunction>();
  }

  getCustomType(): string {
    return this.type;
  }

  toJSON(): string {
    return this.toString();
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

  instanceOf(v: CustomValue): boolean {
    return (
      v instanceof CustomInterface && v.getCustomType() === this.getCustomType()
    );
  }

  [Symbol.iterator](): CustomInterfaceIterator {
    return new CustomInterfaceIterator();
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      return this.interfaceFns.has(current.toString());
    }

    return false;
  }

  set(_path: Path<CustomValue> | CustomValue, _newValue: CustomValue) {
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
      if (this.interfaceFns.has(current.toString())) {
        return this.interfaceFns.get(current.toString());
      }
    }

    throw new Error(`Unknown path in interface ${path.toString()}.`);
  }

  addFunction(name: string, fn: CustomFunction): CustomInterface {
    this.interfaceFns.set(name, fn);
    return this;
  }
}
