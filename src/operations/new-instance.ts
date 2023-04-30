import { ASTUnaryExpression } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomMap } from '../types/map';
import { CPSVisit, Operation } from './operation';

export class NewInstance extends Operation {
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
    const resolvedArg = await this.arg.handle(ctx);

    if (resolvedArg instanceof CustomMap) {
      return (resolvedArg as CustomMap).createInstance();
    }

    return DefaultType.Void;
  }
}
