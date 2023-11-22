import { CustomValue } from '../types/base';
import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { CustomFunction } from '../types/function';
import { CustomList } from '../types/list';
import { CustomMap } from '../types/map';
import { CustomNil } from '../types/nil';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { deepEqual } from '../utils/deep-equal';

export const absClamp01 = (d: number): number => {
  if (d < 0) d = -d;
  if (d > 1) return 1;
  return d;
};

export function evalAdd(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomString || b instanceof CustomString) {
    if (a instanceof CustomNil) a = new CustomString('');
    if (b instanceof CustomNil) b = new CustomString('');
    return new CustomString(a.toString() + b.toString());
  } else if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() + b.toNumber());
  } else if (a instanceof CustomList) {
    if (b instanceof CustomList) {
      return a.fork().extend(b);
    }
    return DefaultType.Void;
  } else if (a instanceof CustomMap) {
    if (b instanceof CustomMap) {
      return a.fork().extend(b);
    }
    return DefaultType.Void;
  }
  return DefaultType.Void;
}

const minusString = (a: CustomString, b: CustomValue): CustomValue => {
  const origin = a.toString();
  const toRemove = b.toString();

  if (origin.endsWith(toRemove)) {
    return new CustomString(
      origin.substring(0, origin.length - toRemove.length)
    );
  }

  return new CustomString(origin);
};

export function evalSub(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return minusString(a, b);
  } else if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() - b.toNumber());
  }
  return DefaultType.Void;
}

const multiplyString = (a: CustomString, b: CustomValue): CustomValue => {
  const factor = b.toNumber();

  if (factor <= 0) {
    return new CustomString('');
  }

  let newString = '';
  const max = Math.floor(a.value.length * factor);

  for (let index = 0; index < max; index++) {
    newString += a.value[index % a.value.length];
  }

  return new CustomString(newString);
};

const multiplyList = (a: CustomList, b: CustomNumber): CustomValue => {
  const factor = b.toNumber();

  if (factor <= 0) {
    return new CustomList();
  }

  const newListValue: CustomValue[] = [];
  const max = Math.floor(a.value.length * factor);

  for (let index = 0; index < max; index++) {
    newListValue.push(a.value[index % a.value.length]);
  }

  return new CustomList(newListValue);
};

export function evalMul(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return multiplyString(a, b);
  } else if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() * b.toNumber());
  } else if (a instanceof CustomList && b instanceof CustomNumber) {
    return multiplyList(a, b);
  }
  return DefaultType.Void;
}

const divideString = (a: CustomString, b: CustomValue): CustomValue => {
  const factor = 1 / b.toNumber();

  if (factor <= 0) {
    return new CustomString('');
  }

  let newString = '';
  const max = Math.floor(a.value.length * factor);

  for (let index = 0; index < max; index++) {
    newString += a.value[index % a.value.length];
  }

  return new CustomString(newString);
};

const divideList = (a: CustomList, b: CustomNumber): CustomValue => {
  const factor = 1 / b.toNumber();

  if (factor <= 0) {
    return new CustomList();
  }

  const newListValue: CustomValue[] = [];
  const max = Math.floor(a.value.length * factor);

  for (let index = 0; index < max; index++) {
    newListValue.push(a.value[index % a.value.length]);
  }

  return new CustomList(newListValue);
};

export function evalDiv(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return divideString(a, b);
  } else if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() / b.toNumber());
  } else if (a instanceof CustomList && b instanceof CustomNumber) {
    return divideList(a, b);
  }
  return DefaultType.Void;
}

export function evalBitwiseOr(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() | b.toNumber());
  }
  return DefaultType.Void;
}

export function evalBitwiseAnd(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() & b.toNumber());
  }
  return DefaultType.Void;
}

export function evalBitwiseRightShift(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() >> b.toNumber());
  }
  return DefaultType.Void;
}

export function evalBitwiseUnsignedRightShift(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() >>> b.toNumber());
  }
  return DefaultType.Void;
}

export function evalBitwiseLeftShift(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() << b.toNumber());
  }
  return DefaultType.Void;
}

export function evalLessThan(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomBoolean(a.toNumber() < b.toNumber());
  } else if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return new CustomBoolean(a.toString() < b.toString());
  }
  return DefaultType.Void;
}

export function evalLessThanOrEqual(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomBoolean(a.toNumber() <= b.toNumber());
  } else if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return new CustomBoolean(a.toString() <= b.toString());
  }
  return DefaultType.Void;
}

export function evalGreaterThan(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomBoolean(a.toNumber() > b.toNumber());
  } else if (a instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return new CustomBoolean(a.toString() > b.toString());
  }
  return DefaultType.Void;
}

export function evalGreaterThanOrEqual(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomBoolean(a.toNumber() >= b.toNumber());
  } else if (a instanceof CustomString && b instanceof CustomString) {
    if (b instanceof CustomNil) b = new CustomString('');
    return new CustomBoolean(a.toString() >= b.toString());
  }
  return DefaultType.Void;
}

export function evalEqual(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    return new CustomBoolean(a.value === b.value);
  } else if (a instanceof CustomString) {
    return new CustomBoolean(a.value === b.value);
  } else if (a instanceof CustomList && b instanceof CustomList) {
    return new CustomBoolean(deepEqual(a, b));
  } else if (a instanceof CustomMap && b instanceof CustomMap) {
    return new CustomBoolean(deepEqual(a, b));
  } else if (a instanceof CustomFunction) {
    return new CustomBoolean(a === b);
  } else if (a instanceof CustomNil) {
    return new CustomBoolean(b instanceof CustomNil);
  }
  return DefaultType.False;
}

export function evalNotEqual(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    return new CustomBoolean(a.value !== b.value);
  } else if (a instanceof CustomString) {
    return new CustomBoolean(a.value !== b.value);
  } else if (a instanceof CustomList && b instanceof CustomList) {
    return new CustomBoolean(!deepEqual(a, b));
  } else if (a instanceof CustomMap && b instanceof CustomMap) {
    return new CustomBoolean(!deepEqual(a, b));
  } else if (a instanceof CustomFunction) {
    return new CustomBoolean(a !== b);
  } else if (a instanceof CustomNil) {
    return new CustomBoolean(!(b instanceof CustomNil));
  }
  return DefaultType.True;
}

export function evalMod(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(a.toNumber() % b.toNumber());
  }
  return DefaultType.Void;
}

export function evalPow(a: CustomValue, b: CustomValue) {
  if (a instanceof CustomNumber) {
    if (b instanceof CustomNil) b = new CustomNumber(0);
    if (b instanceof CustomNumber)
      return new CustomNumber(Math.pow(a.toNumber(), b.toNumber()));
  }
  return DefaultType.Void;
}

export function evalAnd(a: CustomValue, b: CustomValue) {
  const left = Number(a instanceof CustomNumber ? a.toNumber() : a.toTruthy());
  const right = Number(b instanceof CustomNumber ? b.toNumber() : b.toTruthy());
  return new CustomNumber(absClamp01(left * right));
}

export function evalOr(a: CustomValue, b: CustomValue) {
  const left = Number(a instanceof CustomNumber ? a.toNumber() : a.toTruthy());
  const right = Number(b instanceof CustomNumber ? b.toNumber() : b.toTruthy());
  return new CustomNumber(absClamp01(left + right - left * right));
}
