import { ASTUnaryExpression } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import { createResolve } from '../utils/create-resolve';
import { CPSVisit, Operation } from './operation';
import { Resolve, ResolveNil } from './resolve';

export class FunctionReference extends Operation {
  readonly item: ASTUnaryExpression;
  ref: Resolve;

  constructor(item: ASTUnaryExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<FunctionReference> {
    this.ref = createResolve(this.item.argument, this.target);
    await this.ref.build(visit);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const exitObserver = ctx.processState.createExitObserver();
    const refResult = await this.ref.getResult(ctx);

    exitObserver.close();

    if (exitObserver.occured()) {
      return DefaultType.Void;
    }

    if (!(refResult.handle instanceof ResolveNil)) {
      if (refResult.path.count() === 0) {
        return refResult.handle;
      }

      const customValueCtx = refResult.handle as CustomValueWithIntrinsics;
      return customValueCtx.get(refResult.path, ctx.contextTypeIntrinsics);
    }

    return ctx.get(refResult.path);
  }
}
