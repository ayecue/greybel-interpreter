import { ASTCallExpression } from 'greyscript-core';

import OperationContext from '../context';
import Defaults from '../types/default';
import CustomFunction from '../types/function';
import { CustomValue } from '../types/generics';
import Operation, { CPSVisit } from './operation';
import Resolve from './resolve';

export default class Call extends Operation {
  readonly item: ASTCallExpression;
  fnRef: Resolve;
  args: Array<Operation>;

  constructor(item: ASTCallExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Call> {
    this.fnRef = new Resolve(this.item.base);
    await this.fnRef.build(visit);
    const args = this.item.arguments.map((arg) => visit(arg));
    this.args = await Promise.all(args);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const resolveResult = await this.fnRef.getResult(ctx);
    const valueRef = await this.fnRef.handle(ctx, resolveResult, false);
    const fnArgs: Array<CustomValue> = [];

    for (let index = 0; index < this.args.length; index++) {
      fnArgs.push(await this.args[index].handle(ctx));
    }

    if (valueRef instanceof CustomFunction) {
      const func = valueRef as CustomFunction;
      return func.run(resolveResult.handle, fnArgs, ctx);
    }

    return Defaults.Void;
  }
}
