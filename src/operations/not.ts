import { ASTUnaryExpression } from 'greyscript-core';

import context from '../context';
import CustomValue from '../types/base';
import CustomBoolean from '../types/boolean';
import Operation, { CPSVisit } from './operation';

export default class Not extends Operation {
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

  async handle(ctx: context): Promise<CustomValue> {
    const result = await this.arg.handle(ctx);
    return new CustomBoolean(!result.toTruthy());
  }
}
