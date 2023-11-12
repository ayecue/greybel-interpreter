import { ASTBase } from 'miniscript-core';

import { ContextType, OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';

export interface IsEOL {
  (): boolean;
}

export class Block extends Operation {
  readonly stack: Array<Operation>;

  constructor(item: ASTBase, stack: Array<Operation>) {
    super(item, 'block');
    this.stack = stack;
  }

  build(_visit: CPSVisit): Promise<Block> {
    return Promise.resolve(this);
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    let isEOL: IsEOL = () => false;

    if (ctx.type === ContextType.Loop) {
      isEOL = () =>
        ctx.functionState.isReturn ||
        ctx.loopState.isBreak ||
        ctx.loopState.isContinue;
    } else if (ctx.type === ContextType.Function) {
      isEOL = () => ctx.functionState.isReturn;
    }

    const exitObserver = ctx.processState.createExitObserver();

    for (let index = 0; index < this.stack.length; index++) {
      if (isEOL() || exitObserver.occured()) {
        break;
      }

      const op = this.stack[index];

      await ctx.step(op);
    }

    exitObserver.close();

    return DefaultType.Void;
  }
}
