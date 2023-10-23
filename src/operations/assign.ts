import { ASTAssignmentStatement } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import { createResolve } from '../utils/create-resolve';
import { FunctionOperation } from './function';
import { CPSVisit, Operation } from './operation';
import { Resolve, ResolveNil } from './resolve';

export class Assign extends Operation {
  readonly item: ASTAssignmentStatement;
  left: Resolve;
  right: Operation;

  constructor(item: ASTAssignmentStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.left = createResolve(this.item.variable, this.target);
    await this.left.build(visit);
    this.right = await visit(this.item.init);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const resolveResult = await this.left.getResult(ctx);

    if (ctx.isExit()) {
      return DefaultType.Void;
    }

    if (resolveResult.path.count() === 0) {
      throw new Error('Resolve path cannot be empty.');
    }

    let rightValue;

    if (this.right instanceof FunctionOperation) {
      rightValue = await this.right.handle(ctx, true);
    } else {
      rightValue = await this.right.handle(ctx);
    }

    if (!(resolveResult.handle instanceof ResolveNil)) {
      const resultValueCtx = resolveResult.handle as CustomValueWithIntrinsics;
      resultValueCtx.set(resolveResult.path, rightValue);
    } else {
      ctx.set(resolveResult.path, rightValue);
    }

    return DefaultType.Void;
  }
}
