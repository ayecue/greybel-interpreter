import { ASTBase } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';

export class DebuggerStatement extends Operation {
  readonly item: ASTBase;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<DebuggerStatement> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    ctx.debugger.setBreakpoint(true);
    return Promise.resolve(DefaultType.Void);
  }
}
