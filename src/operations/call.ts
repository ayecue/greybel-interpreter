import { ASTCallExpression } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomFunction } from '../types/function';
import { CustomMap } from '../types/map';
import { createResolve } from '../utils/create-resolve';
import { CPSVisit, Operation } from './operation';
import { Resolve } from './resolve';

export class Call extends Operation {
  readonly item: ASTCallExpression;
  fnRef: Resolve;
  args: Array<Operation>;

  constructor(item: ASTCallExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Call> {
    this.fnRef = createResolve(this.item.base, this.target);
    await this.fnRef.build(visit);
    const args = this.item.arguments.map((arg) => visit(arg));
    this.args = await Promise.all(args);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const resolveResult = await this.fnRef.getResult(ctx);

    if (ctx.isExit()) {
      return DefaultType.Void;
    }

    const valueRef = await this.fnRef.handle(ctx, resolveResult, false);
    const fnArgs: Array<CustomValue> = [];

    for (let index = 0; index < this.args.length; index++) {
      fnArgs.push(await this.args[index].handle(ctx));
    }

    if (valueRef instanceof CustomFunction) {
      const func = valueRef as CustomFunction;

      if (
        this.fnRef.path.isSuper() &&
        ctx.functionState.context &&
        resolveResult.handle instanceof CustomMap
      ) {
        return func.run(
          ctx.functionState.context,
          fnArgs,
          ctx,
          resolveResult.handle.getIsa()
        );
      }

      return func.run(resolveResult.handle, fnArgs, ctx);
    }

    return DefaultType.Void;
  }
}
