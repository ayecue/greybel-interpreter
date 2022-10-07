import { ASTBase } from 'greyscript-core';

import context from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import Operation, { CPSVisit } from './operation';

export default class DebuggerStatement extends Operation {
  readonly item: ASTBase;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<DebuggerStatement> {
    return Promise.resolve(this);
  }

  handle(ctx: context): Promise<CustomValue> {
    ctx.debugger.setBreakpoint(true);
    return Promise.resolve(Defaults.Void);
  }
}
