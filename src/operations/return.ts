import { ASTReturnStatement } from 'greyscript-core';

import context from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import Operation, { CPSVisit } from './operation';
import Reference from './reference';

export default class Return extends Operation {
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
      this.arg = new Reference(Defaults.Void);
    }
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    //no typesafe equal
    if (ctx.functionState != null) {
      ctx.functionState.value = await this.arg.handle(ctx);
      ctx.functionState.isReturn = true;
    }

    return Defaults.Void;
  }
}
