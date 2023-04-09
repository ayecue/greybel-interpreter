import { ASTBase } from 'greyscript-core';

import OperationContext, { ContextType } from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import Operation, { CPSVisit } from './operation';

export interface IsEOL {
  (): boolean;
}

export default class Block extends Operation {
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
      isEOL = () => ctx.loopState.isBreak || ctx.loopState.isContinue;
    } else if (ctx.type === ContextType.Function) {
      isEOL = () => ctx.functionState.isReturn;
    }

    for (let index = 0; index < this.stack.length; index++) {
      if (isEOL() || ctx.isExit()) {
        break;
      }

      const op = this.stack[index];

      await ctx.step(op);
      await op.handle(ctx);
    }

    return Defaults.Void;
  }
}
