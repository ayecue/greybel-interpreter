import OperationContext, { ContextType } from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
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

    return new Promise((resolve, _reject) => {
      let index = 0;

      const iteration = async (): Promise<void> => {
        if (index >= this.stack.length || isEOL() || ctx.isExit()) {
          resolve(Defaults.Void);
          return;
        }

        const op = this.stack[index];

        await ctx.step(op);
        await op.handle(ctx);

        index++;

        process.nextTick(iteration);
      };

      iteration();
    });
  }
}
