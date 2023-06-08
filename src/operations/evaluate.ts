import { ASTEvaluationExpression, ASTType, Operator } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { CustomFunction } from '../types/function';
import { CustomInterface } from '../types/interface';
import { CustomList } from '../types/list';
import { CustomMap } from '../types/map';
import { CustomNil } from '../types/nil';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { deepEqual } from '../utils/deep-equal';
import { CPSVisit, Operation } from './operation';

export interface ProcessorHandlerFunction {
  (op: string, a: CustomValue, b: CustomValue): CustomValue;
}

export interface ProcessorHandler {
  [op: string]: (a: CustomValue, b: CustomValue) => CustomValue;
}

export const GenericProcessorHandler: ProcessorHandler = {
  [Operator.And]: (a, b) => new CustomBoolean(a.toTruthy() && b.toTruthy()),
  [Operator.Or]: (a, b) => new CustomBoolean(a.toTruthy() || b.toTruthy())
};

export const NumberProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (a, b) => new CustomNumber(a.toNumber() + b.toNumber()),
  [Operator.Minus]: (a, b) => new CustomNumber(a.toNumber() - b.toNumber()),
  [Operator.Slash]: (a, b) => new CustomNumber(a.toNumber() / b.toNumber()),
  [Operator.Asterik]: (a, b) => new CustomNumber(a.toNumber() * b.toNumber()),
  [Operator.Power]: (a, b) =>
    new CustomNumber(Math.pow(a.toNumber(), b.toNumber())),
  [Operator.BitwiseOr]: (a, b) => new CustomNumber(a.toInt() | b.toInt()),
  [Operator.LessThan]: (a, b) => new CustomBoolean(a.toNumber() < b.toNumber()),
  [Operator.GreaterThan]: (a, b) =>
    new CustomBoolean(a.toNumber() > b.toNumber()),
  [Operator.LeftShift]: (a, b) => new CustomNumber(a.toInt() << b.toInt()),
  [Operator.RightShift]: (a, b) => new CustomNumber(a.toInt() >> b.toInt()),
  [Operator.UnsignedRightShift]: (a, b) =>
    new CustomNumber(a.toInt() >> b.toInt()),
  [Operator.BitwiseAnd]: (a, b) => new CustomNumber(a.toInt() & b.toInt()),
  [Operator.PercentSign]: (a, b) =>
    new CustomNumber(a.toNumber() % b.toNumber()),
  [Operator.GreaterThanOrEqual]: (a, b) =>
    new CustomBoolean(a.toNumber() >= b.toNumber()),
  [Operator.Equal]: (a, b) => new CustomBoolean(a.toNumber() === b.toNumber()),
  [Operator.LessThanOrEqual]: (a, b) =>
    new CustomBoolean(a.toNumber() <= b.toNumber()),
  [Operator.NotEqual]: (a, b) =>
    new CustomBoolean(a.toNumber() !== b.toNumber())
};

export const multiplyString = (a: CustomValue, b: CustomValue): CustomValue => {
  const multiStr = new Array(b.toNumber()).fill(a.toString()).join('');
  return new CustomString(multiStr);
};

export const StringProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (a, b) => new CustomString(a.toString() + b.toString()),
  [Operator.Asterik]: (a, b) => multiplyString(a, b),
  [Operator.LessThan]: (a, b) =>
    new CustomBoolean(a.toString().length < b.toString().length),
  [Operator.GreaterThan]: (a, b) =>
    new CustomBoolean(a.toString().length > b.toString().length),
  [Operator.GreaterThanOrEqual]: (a, b) =>
    new CustomBoolean(a.toString().length >= b.toString().length),
  [Operator.Equal]: (a, b) => new CustomBoolean(a.toString() === b.toString()),
  [Operator.LessThanOrEqual]: (a, b) =>
    new CustomBoolean(a.toString().length <= b.toString().length),
  [Operator.NotEqual]: (a, b) =>
    new CustomBoolean(a.toString() !== b.toString())
};

export const multiplyList = (a: CustomList, b: CustomValue): CustomValue => {
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

export const divideList = (a: CustomList, b: CustomValue): CustomValue => {
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

export const ListProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return left.fork().extend(right);
    }
    return left;
  },
  [Operator.LessThan]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(left.value.length < right.value.length);
    }
    return DefaultType.Void;
  },
  [Operator.GreaterThan]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(left.value.length > right.value.length);
    }
    return DefaultType.Void;
  },
  [Operator.GreaterThanOrEqual]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(left.value.length >= right.value.length);
    }
    return DefaultType.Void;
  },
  [Operator.Equal]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(deepEqual(left, right));
    }
    return DefaultType.Void;
  },
  [Operator.LessThanOrEqual]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(left.value.length <= right.value.length);
    }
    return DefaultType.Void;
  },
  [Operator.NotEqual]: (left: CustomList, right: CustomValue) => {
    if (right instanceof CustomList) {
      return new CustomBoolean(!deepEqual(left, right));
    }
    return DefaultType.Void;
  },
  [Operator.Asterik]: (left: CustomList, right) => multiplyList(left, right),
  [Operator.Slash]: (left: CustomList, right) => divideList(left, right)
};

export const MapProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return left.fork().extend(right);
    }
    return left;
  },
  [Operator.LessThan]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(left.value.size < right.value.size);
    }
    return DefaultType.Void;
  },
  [Operator.GreaterThan]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(left.value.size > right.value.size);
    }
    return DefaultType.Void;
  },
  [Operator.GreaterThanOrEqual]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(left.value.size >= right.value.size);
    }
    return DefaultType.Void;
  },
  [Operator.Equal]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(deepEqual(left, right));
    }
    return DefaultType.Void;
  },
  [Operator.LessThanOrEqual]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(left.value.size <= right.value.size);
    }
    return DefaultType.Void;
  },
  [Operator.NotEqual]: (left: CustomMap, right: CustomValue) => {
    if (right instanceof CustomMap) {
      return new CustomBoolean(!deepEqual(left, right));
    }
    return DefaultType.Void;
  }
};

export const InterfaceProcessorHandler: ProcessorHandler = {
  [Operator.Equal]: (left: CustomInterface, right: CustomValue) =>
    new CustomBoolean(left.value === right.value),
  [Operator.NotEqual]: (left: CustomInterface, right: CustomValue) =>
    new CustomBoolean(left.value !== right.value)
};

export const NilProcessorHandler: ProcessorHandler = {
  [Operator.Equal]: (_a, b) => new CustomBoolean(b instanceof CustomNil),
  [Operator.NotEqual]: (_a, b) => new CustomBoolean(!(b instanceof CustomNil))
};

export const FunctionProcessorHandler: ProcessorHandler = {
  [Operator.Equal]: (a, b) => new CustomBoolean(a === b),
  [Operator.NotEqual]: (a, b) => new CustomBoolean(a !== b)
};

export const handleNumber: ProcessorHandlerFunction = (op, a, b) => {
  if (op in NumberProcessorHandler) {
    return NumberProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleString: ProcessorHandlerFunction = (op, a, b) => {
  if (op in StringProcessorHandler) {
    return StringProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleList: ProcessorHandlerFunction = (op, a, b) => {
  const left = a as CustomList;
  const right = b;

  if (op in ListProcessorHandler) {
    return ListProcessorHandler[op](left, right);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleMap: ProcessorHandlerFunction = (op, a, b) => {
  const left = a as CustomMap;
  const right = b;

  if (op in MapProcessorHandler) {
    return MapProcessorHandler[op](left, right);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleInterface: ProcessorHandlerFunction = (op, a, b) => {
  const left = a as CustomInterface;
  const right = b;

  if (op in InterfaceProcessorHandler) {
    return InterfaceProcessorHandler[op](left, right);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleNil: ProcessorHandlerFunction = (op, a, b) => {
  if (op in NilProcessorHandler) {
    return NilProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handleFunction: ProcessorHandlerFunction = (op, a, b) => {
  if (op in FunctionProcessorHandler) {
    return FunctionProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return DefaultType.Void;
};

export const handle = (
  op: string,
  a: CustomValue,
  b: CustomValue
): CustomValue => {
  if (a instanceof CustomBoolean) {
    a = new CustomNumber(a.toInt());
  }

  if (b instanceof CustomBoolean) {
    b = new CustomNumber(b.toInt());
  }

  if (op === Operator.Equal && a.getCustomType() !== b.getCustomType()) {
    return DefaultType.False;
  } else if (
    op === Operator.NotEqual &&
    a.getCustomType() !== b.getCustomType()
  ) {
    return DefaultType.True;
  }

  if (
    (a instanceof CustomString || b instanceof CustomString) &&
    op === Operator.Plus
  ) {
    return StringProcessorHandler[op](a, b);
  } else if (a instanceof CustomNumber) {
    return handleNumber(op, a, b);
  } else if (a instanceof CustomString) {
    return handleString(op, a, b);
  } else if (a instanceof CustomList) {
    return handleList(op, a, b);
  } else if (a instanceof CustomMap) {
    return handleMap(op, a, b);
  } else if (a instanceof CustomInterface) {
    return handleInterface(op, a, b);
  } else if (a instanceof CustomFunction) {
    return handleFunction(op, a, b);
  } else if (a instanceof CustomNil) {
    return handleNil(op, a, b);
  }

  return DefaultType.Void;
};

export class Evaluate extends Operation {
  readonly item: ASTEvaluationExpression;
  type: string;
  op: string;
  left: Operation;
  right: Operation;

  constructor(item: ASTEvaluationExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.type = this.item.type;
    this.op = this.item.operator;
    this.left = await visit(this.item.left);
    this.right = await visit(this.item.right);
    return this;
  }

  async resolveBinaryExpression(ctx: OperationContext, expr: Evaluate) {
    const left = await this.resolve(ctx, expr.left);
    const right = await this.resolve(ctx, expr.right);
    return handle(expr.op, left, right);
  }

  async resolveLogicalExpression(ctx: OperationContext, expr: Evaluate) {
    const left = await this.resolve(ctx, expr.left);

    if (expr.op === Operator.And && !left.toTruthy()) {
      return new CustomBoolean(false);
    } else if (expr.op === Operator.Or && left.toTruthy()) {
      return new CustomBoolean(true);
    }

    const right = await this.resolve(ctx, expr.right);

    return handle(expr.op, left, right);
  }

  async resolve(ctx: OperationContext, op: Operation): Promise<CustomValue> {
    if (op instanceof Evaluate) {
      const expr = op as Evaluate;

      switch (expr.type) {
        case ASTType.IsaExpression: {
          const left = await this.resolve(ctx, expr.left);
          const right = await this.resolve(ctx, expr.right);
          return new CustomBoolean(left.instanceOf(right));
        }
        case ASTType.BinaryExpression:
          return this.resolveBinaryExpression(ctx, expr);
        case ASTType.LogicalExpression:
          return this.resolveLogicalExpression(ctx, expr);
        default:
          break;
      }
    }

    return op.handle(ctx);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return this.resolve(ctx, this);
  }
}
