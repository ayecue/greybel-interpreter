import { ASTBase } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';

export class Break extends Operation {
  readonly item: ASTBase;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<Break> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    if (ctx.loopState !== null) {
      ctx.loopState.isBreak = true;
    }
    return Promise.resolve(DefaultType.Void);
  }
}
