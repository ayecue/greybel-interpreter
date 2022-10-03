import { ASTBase } from 'greyscript-core';

import OperationContext from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import Operation, { CPSVisit } from './operation';

export default class Continue extends Operation {
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
    return Promise.resolve(Defaults.Void);
  }
}
