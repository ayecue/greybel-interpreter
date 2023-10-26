import { ASTWhileStatement } from 'greyscript-core';

import {
  ContextState,
  ContextType,
  LoopState,
  OperationContext
} from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { setImmediate } from '../utils/set-immediate';
import { Block } from './block';
import { CPSVisit, Operation, OperationBlock } from './operation';

export class While extends OperationBlock {
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
    this.block = new Block(this.item, stack);
    this.condition = await visit(this.item.condition);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const whileCtx = ctx.fork({
      type: ContextType.Loop,
      state: ContextState.Temporary
    });
    const loopState = new LoopState();
    const exitObserver = ctx.processState.createExitObserver();

    whileCtx.loopState = loopState;

    return new Promise((resolve, reject) => {
      const iteration = async (): Promise<void> => {
        try {
          const conditionResult = await whileCtx.step(this.condition);

          if (!conditionResult.toTruthy()) {
            exitObserver.close();
            resolve(DefaultType.Void);
            return;
          }

          loopState.isContinue = false;
          await this.block.handle(whileCtx);

          if (
            loopState.isBreak ||
            whileCtx.functionState.isReturn ||
            exitObserver.occured()
          ) {
            exitObserver.close();
            resolve(DefaultType.Void);
            return;
          }

          setImmediate(iteration);
        } catch (err: any) {
          exitObserver.close();
          reject(err);
        }
      };

      iteration();
    });
  }
}
