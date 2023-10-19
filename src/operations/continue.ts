import { ASTBase } from 'miniscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';

export class Continue extends Operation {
  readonly item: ASTBase;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<Continue> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    if (ctx.loopState !== null) {
      ctx.loopState.isContinue = true;
    }
    return Promise.resolve(DefaultType.Void);
  }
}
