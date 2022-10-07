import { ASTAssignmentStatement } from 'greyscript-core';

import OperationContext from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import Operation, { CPSVisit } from './operation';
import Resolve from './resolve';

export default class Assign extends Operation {
  readonly item: ASTAssignmentStatement;
  left: Resolve;
  right: Operation;

  constructor(item: ASTAssignmentStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.left = new Resolve(this.item.variable);
    await this.left.build(visit);
    this.right = await visit(this.item.init);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const resolveResult = await this.left.getResult(ctx);
    const rightValue = await this.right.handle(ctx);

    if (resolveResult.handle !== Defaults.Void) {
      const resultValueCtx = resolveResult.handle as CustomValueWithIntrinsics;
      resultValueCtx.set(resolveResult.path, rightValue);
    } else {
      ctx.set(resolveResult.path, rightValue);
    }

    return Defaults.Void;
  }
}
