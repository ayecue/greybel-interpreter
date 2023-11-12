import { ASTReturnStatement } from 'miniscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';
import { Reference } from './reference';

export class Return extends Operation {
  readonly item: ASTReturnStatement;
  arg: Operation;

  constructor(item: ASTReturnStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    if (this.item.argument) {
      this.arg = await visit(this.item.argument);
    } else {
      this.arg = new Reference(DefaultType.Void);
    }
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    // no typesafe equal
    if (ctx.functionState != null) {
      ctx.functionState.value = await this.arg.handle(ctx);
      ctx.functionState.isReturn = true;
    }

    return DefaultType.Void;
  }
}
