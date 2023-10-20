import { ASTAssignmentStatement } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class AssignGlobals extends Operation {
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

  async handle(_ctx: OperationContext): Promise<CustomValue> {
    throw new Error('Cannot assign to globals.');
  }
}
