import IntrinsicsContainer from '../intrinsics-container';
import Path from '../utils/path';
import CustomFunction from './function';
import {
  CustomObject,
  CustomValue,
  CustomValueWithIntrinsics,
  Void,
  ObjectValue
} from './generics';
import CustomString from './string';

export const CLASS_ID_PROPERTY = new CustomString('classID');
export const ISA_PROPERTY = new CustomString('__isa');

export class CustomMapIterator implements Iterator<CustomValue> {
  value: ObjectValue;
  index: number;

  constructor(value: ObjectValue) {
    const me = this;
    me.value = new ObjectValue(value);
    me.index = 0;
  }

  next(): IteratorResult<CustomMap> {
    const me = this;
    const keys = Array.from(me.value.keys());

    if (me.index === keys.length) {
      return {
        value: Void,
        done: true
      };
    }

    const key = keys[me.index++];

    return {
      value: new CustomMap(
        new ObjectValue([
          [new CustomString('key'), key],
          [new CustomString('value'), me.value.get(key)]
        ])
      ),
      done: false
    };
  }
}

export default class CustomMap extends CustomObject {
  private static intrinsics: IntrinsicsContainer = new IntrinsicsContainer();

  static getIntrinsics(): IntrinsicsContainer {
    return this.intrinsics;
  }

  static addIntrinsic(name: string, fn: CustomFunction) {
    this.intrinsics.add(name, fn);
  }

  readonly value: ObjectValue;
  readonly isa: ObjectValue;
  private isInstance: boolean = false;

  constructor(
    value: ObjectValue = new ObjectValue(),
    isa: ObjectValue = new ObjectValue()
  ) {
    super();
    this.value = new ObjectValue(value);
    this.isa = new ObjectValue(isa);
  }

  getCustomType(): string {
    if (this.value.has(CLASS_ID_PROPERTY)) {
      return this.value.get(CLASS_ID_PROPERTY).toString();
    }

    return 'map';
  }

  toString(): string {
    const json: { [key: string]: any } = { [ISA_PROPERTY.toString()]: {} };

    for (const [key, value] of this.isa.entries()) {
      json.__isa[key.toString()] = value.toString();
    }

    for (const [key, value] of this.value.entries()) {
      json[key.toString()] = value.toString();
    }

    return JSON.stringify(json);
  }

  fork(): CustomMap {
    return new CustomMap(this.value);
  }

  toNumber(): number {
    return 0;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return this.value.size > 0;
  }

  [Symbol.iterator](): CustomMapIterator {
    return new CustomMapIterator(this.value);
  }

  extend(map: CustomMap | ObjectValue): CustomMap {
    if (map instanceof CustomMap) {
      map = map.value;
    }

    for (const [key, value] of map) {
      this.value.set(key, value);
    }

    return this;
  }

  has(path: Path<CustomValue> | CustomValue): boolean {
    if (path instanceof CustomValue) {
      return this.has(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (
          traversalPath.count() > 0 &&
          sub instanceof CustomValueWithIntrinsics
        ) {
          return sub.has(traversalPath);
        }

        return traversalPath.count() === 0;
      } else if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (
          traversalPath.count() > 0 &&
          sub instanceof CustomValueWithIntrinsics
        ) {
          return sub.has(traversalPath);
        }

        return traversalPath.count() === 0;
      }
    }

    return false;
  }

  set(path: Path<CustomValue> | CustomValue, newValue: CustomValue): void {
    if (path instanceof CustomValue) {
      return this.set(new Path<CustomValue>([path]), newValue);
    }

    const traversalPath = path.clone();
    const last = traversalPath.last();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (sub instanceof CustomValueWithIntrinsics) {
          sub.set(traversalPath, newValue);
          return;
        }
      }

      throw new Error(`Cannot set path ${path.toString()}.`);
    }

    this.value.set(last, newValue);
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      if (this.value.has(current)) {
        const sub = this.value.get(current);

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      } else if (this.isa.has(current)) {
        const sub = this.isa.get(current);

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      } else if (current.toString() === ISA_PROPERTY.toString()) {
        if (path.count() === 1) {
          return new CustomMap(this.isa);
        } else {
          const ahead = traversalPath.next();

          if (this.isa.has(ahead)) {
            const sub = this.isa.get(ahead);

            if (traversalPath.count() > 0) {
              if (sub instanceof CustomValueWithIntrinsics) {
                return sub.get(traversalPath);
              }
            } else if (traversalPath.count() === 0) {
              return sub;
            }
          }
        }
      } else if (
        path.count() === 1 &&
        CustomMap.getIntrinsics().has(current.toString())
      ) {
        return CustomMap.getIntrinsics().get(current.toString());
      }
    }

    throw new Error(`Unknown path in map ${path.toString()}.`);
  }

  createInstance(): CustomMap {
    const newInstance = new CustomMap(new ObjectValue(), new ObjectValue(this.isa));

    for (const [k, v] of this.value.entries()) {
      newInstance.isa.set(k, v);
    }

    newInstance.isInstance = true;
    return newInstance;
  }
}
