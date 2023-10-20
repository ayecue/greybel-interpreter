import { ASTAssignmentStatement } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
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
    const rightValue = await this.right.handle(ctx);
    ctx.functionState.context = rightValue;
    return DefaultType.Void;
  }
}
