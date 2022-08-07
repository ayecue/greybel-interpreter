import { ASTBase } from 'greyscript-core';

import OperationContext from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import Operation, { CPSVisit } from './operation';

export default class Break extends Operation {
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
    return Promise.resolve(Defaults.Void);
  }
}
