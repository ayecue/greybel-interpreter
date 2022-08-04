import { ASTEvaluationExpression, ASTType, Operator } from 'greyscript-core';

import OperationContext from '../context';
import CustomBoolean from '../types/boolean';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import CustomList from '../types/list';
import CustomMap from '../types/map';
import CustomNumber from '../types/number';
import CustomString from '../types/string';
import Operation, { CPSVisit } from './operation';

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
  [Operator.Xor]: (a, b) => new CustomNumber(a.toInt() ^ b.toInt()),
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

export const StringProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (a, b) => new CustomString(a.toString() + b.toString()),
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

export const ListProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (left: CustomList, right: CustomList) =>
    left.fork().extend(right),
  [Operator.LessThan]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value.length < right.value.length),
  [Operator.GreaterThan]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value.length > right.value.length),
  [Operator.GreaterThanOrEqual]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value.length >= right.value.length),
  [Operator.Equal]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value === right.value),
  [Operator.LessThanOrEqual]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value.length <= right.value.length),
  [Operator.NotEqual]: (left: CustomList, right: CustomList) =>
    new CustomBoolean(left.value !== right.value)
};

export const MapProcessorHandler: ProcessorHandler = {
  [Operator.Plus]: (left: CustomMap, right: CustomMap) =>
    left.fork().extend(right),
  [Operator.LessThan]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value.size < right.value.size),
  [Operator.GreaterThan]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value.size > right.value.size),
  [Operator.GreaterThanOrEqual]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value.size >= right.value.size),
  [Operator.Equal]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value === right.value),
  [Operator.LessThanOrEqual]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value.size <= right.value.size),
  [Operator.NotEqual]: (left: CustomMap, right: CustomMap) =>
    new CustomBoolean(left.value !== right.value)
};

export const handleNumber: ProcessorHandlerFunction = (op, a, b) => {
  if (op in NumberProcessorHandler) {
    return NumberProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return Defaults.Void;
};

export const handleString: ProcessorHandlerFunction = (op, a, b) => {
  if (op in StringProcessorHandler) {
    return StringProcessorHandler[op](a, b);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return Defaults.Void;
};

export const handleBoolean: ProcessorHandlerFunction = (op, a, b) => {
  return handleNumber(op, a, b);
};

export const handleList: ProcessorHandlerFunction = (op, a, b) => {
  const left = a as CustomList;
  const right = b instanceof CustomList ? (b as CustomList) : new CustomList();

  if (op in ListProcessorHandler) {
    return ListProcessorHandler[op](left, right);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return Defaults.Void;
};

export const handleMap: ProcessorHandlerFunction = (op, a, b) => {
  const left = a as CustomMap;
  const right = b instanceof CustomMap ? (b as CustomMap) : new CustomMap();

  if (op in MapProcessorHandler) {
    return MapProcessorHandler[op](left, right);
  } else if (op in GenericProcessorHandler) {
    return GenericProcessorHandler[op](a, b);
  }

  return Defaults.Void;
};

export const handle = (
  ctx: OperationContext,
  op: string,
  a: CustomValue,
  b: CustomValue
): CustomValue => {
  if (a instanceof CustomString) {
    return handleString(op, a, b);
  } else if (a instanceof CustomNumber) {
    return handleNumber(op, a, b);
  } else if (a instanceof CustomBoolean) {
    return handleBoolean(op, a, b);
  } else if (a instanceof CustomList) {
    return handleList(op, a, b);
  } else if (a instanceof CustomMap) {
    return handleMap(op, a, b);
  }

  return Defaults.Void;
};

export default class Evaluate extends Operation {
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
    return handle(ctx, expr.op, left, right);
  }

  async resolveLogicalExpression(ctx: OperationContext, expr: Evaluate) {
    const left = await this.resolve(ctx, expr.left);

    if (expr.op === Operator.And && !left.toTruthy()) {
      return new CustomBoolean(false);
    } else if (expr.op === Operator.Or && left.toTruthy()) {
      return new CustomBoolean(true);
    }

    const right = await this.resolve(ctx, expr.right);

    return handle(ctx, expr.op, left, right);
  }

  async resolve(ctx: OperationContext, op: Operation): Promise<CustomValue> {
    if (op instanceof Evaluate) {
      const expr = op as Evaluate;

      switch (expr.type) {
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
