import { CustomValue } from '../types/base';
import { Void } from '../types/nil';
import { deepEqual } from './deep-equal';

export class ObjectValue extends Map<CustomValue, CustomValue> {
  get(mapKey: CustomValue): CustomValue {
    for (const [key, value] of this.entries()) {
      if (deepEqual(key, mapKey)) {
        return value;
      }
    }
    return Void;
  }

  has(mapKey: CustomValue): boolean {
    for (const key of this.keys()) {
      if (deepEqual(key, mapKey)) {
        return true;
      }
    }
    return false;
  }

  set(mapKey: CustomValue, mapValue: CustomValue): this {
    for (const key of this.keys()) {
      if (deepEqual(key, mapKey)) {
        super.set(key, mapValue);
        return;
      }
    }
    super.set(mapKey, mapValue);
    return this;
  }

  delete(mapKey: CustomValue) {
    for (const key of this.keys()) {
      if (deepEqual(key, mapKey)) {
        super.delete(key);
        return true;
      }
    }
    return false;
  }

  extend(objVal: ObjectValue): this {
    for (const [key, value] of objVal) {
      this.set(key, value);
    }
    return this;
  }
}
