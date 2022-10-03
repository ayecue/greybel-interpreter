import OperationContext, { ContextType } from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import CustomString from '../types/string';
import Operation, { CPSVisit } from './operation';

export interface IsEOL {
  (): boolean;
}

export default class Block extends Operation {
  readonly stack: Array<Operation>;

  constructor(stack: Array<Operation>) {
    super(null, 'block');
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

    ctx.set(new CustomString('globals'), ctx.globals.scope);
    ctx.set(new CustomString('locals'), ctx.locals.scope);

    if (ctx.previous && ctx.previous.type !== ContextType.Api) {
      ctx.set(new CustomString('outer'), ctx.previous.locals.scope);
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
