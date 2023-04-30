import { ASTUnaryExpression, Operator } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomNumber } from '../types/number';
import { CPSVisit, Operation } from './operation';

export class NegatedBinary extends Operation {
  readonly item: ASTUnaryExpression;
  arg: Operation;

  constructor(item: ASTUnaryExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.arg = await visit(this.item.argument);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    switch (this.item.operator) {
      case Operator.Minus:
        return new CustomNumber(-(await this.arg.handle(ctx)).toNumber());
      case Operator.Plus:
        return new CustomNumber(+(await this.arg.handle(ctx)).toNumber());
      default:
        throw new Error('Unexpected negation operator.');
    }
  }
}
