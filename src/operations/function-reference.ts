import { ASTUnaryExpression } from 'greyscript-core';

import OperationContext from '../context';
import Defaults from '../types/default';
import { CustomValue, CustomValueWithIntrinsics } from '../types/generics';
import Operation, { CPSVisit } from './operation';
import Resolve from './resolve';

export default class FunctionReference extends Operation {
  readonly item: ASTUnaryExpression;
  ref: Resolve;

  constructor(item: ASTUnaryExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<FunctionReference> {
    this.ref = new Resolve(this.item.argument);
    await this.ref.build(visit);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const refResult = await this.ref.getResult(ctx);

    if (refResult.handle !== Defaults.Void) {
      if (refResult.path.count() === 0) {
        return refResult.handle;
      }

      const customValueCtx = refResult.handle as CustomValueWithIntrinsics;
      return customValueCtx.get(refResult.path);
    }

    return ctx.get(refResult.path);
  }
}
