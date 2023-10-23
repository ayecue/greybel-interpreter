import { ASTAssignmentStatement } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { FunctionOperation } from './function';
import { CPSVisit, Operation } from './operation';

export class AssignSelf extends Operation {
  readonly item: ASTAssignmentStatement;
  right: Operation;

  constructor(item: ASTAssignmentStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.right = await visit(this.item.init);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    let rightValue;

    if (this.right instanceof FunctionOperation) {
      rightValue = await this.right.handle(ctx, true);
    } else {
      rightValue = await this.right.handle(ctx);
    }

    ctx.functionState.context = rightValue;
    return DefaultType.Void;
  }
}
