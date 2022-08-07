import { ASTUnaryExpression } from 'greyscript-core';

import context from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import CustomMap from '../types/map';
import Operation, { CPSVisit } from './operation';

export default class NewInstance extends Operation {
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
    const resolvedArg = await this.arg.handle(ctx);

    if (resolvedArg instanceof CustomMap) {
      return (resolvedArg as CustomMap).createInstance();
    }

    return Defaults.Void;
  }
}
