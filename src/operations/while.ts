import { ASTWhileStatement } from 'greyscript-core';

import context, { ContextState, ContextType, LoopState } from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import Block from './block';
import Operation, { CPSVisit } from './operation';

export default class While extends Operation {
  readonly item: ASTWhileStatement;
  block: Block;
  condition: Operation;

  constructor(item: ASTWhileStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const stack = await Promise.all(
      this.item.body.map((child) => visit(child))
    );
    this.block = new Block(stack);
    this.condition = await visit(this.item.condition);
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    const whileCtx = ctx.fork({
      type: ContextType.Loop,
      state: ContextState.Temporary
    });
    const loopState = new LoopState();

    whileCtx.loopState = loopState;

    return new Promise((resolve, reject) => {
      const iteration = async (): Promise<void> => {
        try {
          const conditionResult = await this.condition.handle(whileCtx);

          if (!conditionResult.toTruthy()) {
            resolve(Defaults.Void);
            return;
          }

          loopState.isContinue = false;
          await this.block.handle(whileCtx);

          if (loopState.isBreak || ctx.isExit()) {
            resolve(Defaults.Void);
            return;
          }

          process.nextTick(iteration);
        } catch (err: any) {
          reject(err);
        }
      };

      iteration();
    });
  }
}
