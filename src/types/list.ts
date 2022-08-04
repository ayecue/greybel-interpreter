import IntrinsicsContainer from '../intrinsics-container';
import Path from '../utils/path';
import CustomFunction from './function';
import {
  CustomObject,
  CustomValue,
  CustomValueWithIntrinsics
} from './generics';

export class CustomListIterator implements Iterator<CustomValue> {
  value: Array<CustomValue>;
  index: number;

  constructor(value: Array<CustomValue>) {
    const me = this;
    me.value = value;
    me.index = 0;
  }

  next(): IteratorResult<CustomValue> {
    const me = this;

    if (me.index === me.value.length) {
      return {
        value: null,
        done: true
      };
    }

    return {
      value: me.value[me.index++],
      done: false
    };
  }
}

export default class CustomList extends CustomObject {
  static getItemIndex(item: CustomList, index: number): number {
    let n = index | 0;
    if (n < 0) n += item.value.length;
    if (n < 0 || n >= item.value.length) return -1;
    return n;
  }

  private static intrinsics: IntrinsicsContainer = new IntrinsicsContainer();

  static getIntrinsics(): IntrinsicsContainer {
    return this.intrinsics;
  }

  static addIntrinsic(name: string, fn: CustomFunction) {
    this.intrinsics.add(name, fn);
  }

  readonly value: Array<CustomValue>;

  constructor(value: Array<CustomValue> = []) {
    super();
    this.value = value;
  }

  getCustomType(): string {
    return 'list';
  }

  toString(): string {
    return `[ ${this.value.join(', ')} ]`;
  }

  fork(): CustomList {
    return new CustomList(this.value);
  }

  toNumber(): number {
    return Number.NaN;
  }

  toInt(): number {
    return 0;
  }

  toTruthy(): boolean {
    return this.value.length > 0;
  }

  extend(list: CustomList | Array<CustomValue>): CustomList {
    if (list instanceof CustomList) {
      list = list.value;
    }

    for (let index = 0; index < list.length; index++) {
      this.value.push(list[index]);
    }

    return this;
  }

  [Symbol.iterator](): CustomListIterator {
    return new CustomListIterator(this.value);
  }

  getItemIndex(index: number): number {
    return CustomList.getItemIndex(this, index);
  }

  has(path: Path<string> | string): boolean {
    if (typeof path === 'string') {
      return this.has(new Path<string>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      let currentIndex = parseInt(current);
      const isCurrentNumber = !Number.isNaN(currentIndex);

      if (isCurrentNumber) {
        currentIndex = this.getItemIndex(currentIndex);
      }

      if (isCurrentNumber) {
        const sub = this.value[currentIndex];

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

  set(path: Path<string> | string, newValue: CustomValue): void {
    if (typeof path === 'string') {
      return this.set(new Path<string>([path]), newValue);
    }

    const traversalPath = path.clone();
    const last = traversalPath.last();
    const current = traversalPath.next();

    if (current !== null) {
      let currentIndex = parseInt(current);
      const isCurrentNumber = !Number.isNaN(currentIndex);

      if (isCurrentNumber) {
        currentIndex = this.getItemIndex(currentIndex);
      }

      if (
        isCurrentNumber &&
        currentIndex >= 0 &&
        currentIndex < this.value.length
      ) {
        const sub = this.value[currentIndex];

        if (
          traversalPath.count() > 0 &&
          sub instanceof CustomValueWithIntrinsics
        ) {
          sub.set(traversalPath, newValue);
          return;
        }
      }

      throw new Error(`Cannot set path ${path.toString()}.`);
    }

    let lastIndex = parseInt(last);
    const isLastNumber = !Number.isNaN(lastIndex);

    if (isLastNumber) {
      lastIndex = this.getItemIndex(lastIndex);
    }

    if (isLastNumber && lastIndex >= 0 && lastIndex < this.value.length) {
      this.value[lastIndex] = newValue;
      return;
    }

    throw new Error(`Index error (list index ${lastIndex} out of range).`);
  }

  get(path: Path<string> | string): CustomValue {
    if (typeof path === 'string') {
      return this.get(new Path<string>([path]));
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current !== null) {
      let currentIndex = parseInt(current);
      const isCurrentNumber = !Number.isNaN(currentIndex);

      if (isCurrentNumber) {
        currentIndex = this.getItemIndex(currentIndex);
      }

      if (
        isCurrentNumber &&
        currentIndex >= 0 &&
        currentIndex < this.value.length
      ) {
        const sub = this.value[currentIndex];

        if (traversalPath.count() > 0) {
          if (sub instanceof CustomValueWithIntrinsics) {
            return sub.get(traversalPath);
          }
        } else if (traversalPath.count() === 0) {
          return sub;
        }
      } else if (
        path.count() === 1 &&
        CustomList.getIntrinsics().has(current)
      ) {
        return CustomList.getIntrinsics().get(current);
      }

      if (isCurrentNumber) {
        throw new Error(
          `Index error (list index ${currentIndex} out of range).`
        );
      }
    }

    throw new Error(`Unknown path in list ${path.toString()}.`);
  }
}
